import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { claimCase, releaseCase, batchClaimCases, batchReleaseCases } from '@/services/case-allocation.service';
import { z } from 'zod';

const WorklistClaimSchema = z.object({
  accessionNumber: z.string().optional(),
  accessions: z.array(z.string()).optional(),
  action: z.enum(['claim', 'release']).default('claim'),
  force: z.boolean().optional(),
  releaseCompanions: z.boolean().optional(),
});

/**
 * POST /api/worklist/claim
 * Universal compatibility endpoint supporting claim and release actions.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = WorklistClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid claim payload' },
        { status: 400 }
      );
    }

    const { accessionNumber, accessions, action, force, releaseCompanions } = parsed.data;
    const userContext = { id: user?.id, name: user?.name || 'Radiologist' };
    const isForce = Boolean(force) || user?.role === 'admin';

    // Batch mode
    if (accessions && accessions.length > 0) {
      if (action === 'release') {
        const result = await batchReleaseCases(accessions, userContext, isForce, releaseCompanions !== false);
        return NextResponse.json({
          success: true,
          data: result,
          released: result.released,
          conflicts: result.conflicts,
          failed: result.failed,
          allReleasedAccessions: result.allReleasedAccessions,
        });
      } else {
        const result = await batchClaimCases(accessions, userContext, isForce);
        return NextResponse.json({
          success: true,
          data: result,
          claimed: result.claimed,
          conflicts: result.conflicts,
          failed: result.failed,
        });
      }
    }

    // Single mode
    if (!accessionNumber) {
      return NextResponse.json({ success: false, error: 'Accession number or accessions array required' }, { status: 400 });
    }

    if (action === 'release') {
      const result = await releaseCase(accessionNumber, userContext, isForce, releaseCompanions !== false);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.message, conflict: result.conflict }, { status: result.conflict ? 403 : 400 });
      }
      return NextResponse.json({
        success: true,
        data: result,
        releasedAccessions: result.releasedAccessions || [accessionNumber],
      });
    } else {
      const result = await claimCase(accessionNumber, userContext, isForce);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.message, conflict: result.conflict }, { status: result.conflict ? 409 : 400 });
      }
      return NextResponse.json({ success: true, data: result, claim: result });
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'WORKLIST_CLAIM_ACTION',
      entityType: 'Study',
      details: 'Worklist case claim/release action',
    },
  }
);
