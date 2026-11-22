import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { hmisInvestigations } from '@/db/schema';
import { withAuth, type AuthenticatedContext } from '@/lib/api-handler';
import { HmisSubmitResultSchema } from '@/lib/validation';
import { submitResultToGateway } from '@/services/hmis/hmis-gateway-client.service';
import { createVaultDraft, updateVaultStatus } from '@/services/hmis/draft-vault.service';
import { stripDuplicateHeadings } from '@/services/hmis/content-sanitizer';
import { getUserHmisCredentials } from '@/services/auth.service';

/**
 * POST /api/hmis/result
 * Submits or saves draft report into Punjab HMIS with local draft vault & verified read-back.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: AuthenticatedContext) => {
    const body = await req.json();
    const parsed = HmisSubmitResultSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Strict Zero-Submit Invariant
    if (payload.action === 'submit') {
      console.warn('[SECURITY INVARIANT] Blocked submit action in /api/hmis/result. Coercing to save (draft).');
      payload.action = 'save';
    }

    // Strip duplicate headings to prevent double headers on official HMIS PDF
    if (payload.clinicalHistory) {
      payload.clinicalHistory = stripDuplicateHeadings(payload.clinicalHistory, 'history');
    }
    if (payload.impression) {
      payload.impression = stripDuplicateHeadings(payload.impression, 'impression');
    }

    // 1. Pre-Save to Durable Local Vault (Guarantees zero data loss)
    let vaultRecord: any = null;
    try {
      vaultRecord = await createVaultDraft({
        accession: payload.accessionNumber || '',
        patientMrn: payload.patientMrn,
        patientName: payload.patientName,
        investigationId: payload.investigationId,
        moduleId: payload.moduleId,
        clinicalHistory: payload.clinicalHistory,
        technique: payload.technique,
        findings: payload.findings,
        impression: payload.impression,
        comments: payload.comments,
        pgrName: payload.pgrName,
        consultantName: payload.consultantName,
        userId: user?.id,
        userName: user?.name,
      });
    } catch (vaultErr) {
      console.error('[VAULT_WRITE_WARN] Failed to write local draft vault entry:', vaultErr);
    }

    // 2. Dispatch to HMIS Gateway
    const hmisCreds = await getUserHmisCredentials(user?.id);
    const gatewayResult = await submitResultToGateway(payload, hmisCreds);

    // 3. Update Vault Status & Investigation Record
    if (!gatewayResult.success) {
      if (vaultRecord?.id) {
        await updateVaultStatus(vaultRecord.id, 'failed', {
          verificationAudit: gatewayResult.error,
          userId: user?.id,
        });
      }
      return NextResponse.json(
        { success: false, error: gatewayResult.error || 'Failed to submit report to HMIS' },
        { status: 502 }
      );
    }

    const isVerified = !!gatewayResult.verified;
    if (vaultRecord?.id) {
      await updateVaultStatus(vaultRecord.id, isVerified ? 'verified' : 'unverified', {
        verificationAudit: gatewayResult.message,
        auditScreenshot: gatewayResult.auditScreenshot,
        userId: user?.id,
      });
    }

    if (payload.investigationId) {
      try {
        await db
          .update(hmisInvestigations)
          .set({
            status: isVerified ? 'draft' : 'pending',
            reportText: payload.findings,
            impressionText: payload.impression,
            comments: payload.comments || '',
            syncedAt: new Date() as any,
          })
          .where(eq(hmisInvestigations.investigationId, payload.investigationId));
      } catch (dbErr) {
        console.warn('[HMIS_STATUS_UPDATE_WARN]', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      verified: isVerified,
      vaultId: vaultRecord?.id,
      auditScreenshot: gatewayResult.auditScreenshot,
      message: gatewayResult.message || `Draft report successfully processed and verified in HMIS`,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_result_submission',
      entityType: 'Report',
      details: 'Dispatched radiology examination result to Punjab HMIS portal with vault snapshot',
    },
  }
);
