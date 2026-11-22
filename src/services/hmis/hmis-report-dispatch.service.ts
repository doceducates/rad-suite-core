import { getGatewayHeaders } from './hmis-gateway-client.service';
import { db } from '@/db';
import { hmisDraftVault, studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { config } from '@/lib/config';
import { stripClinicalCommentMarks } from '@/lib/clinical-format';

const getGatewayBase = () => config.hmisGatewayUrl;

export interface HmisDraftPayload {
  mrn: string;
  accession?: string;
  patientName?: string;
  moduleId?: string;
  scanType?: string;
  modality?: string;
  bodyPart?: string;
  cpt?: string;
  investigationId?: string;
  technique?: string;
  findings: string;
  impression: string;
  clinicalHistory?: string;
  pgrName?: string;
  consultantName?: string;
  deepVerify?: boolean;
}

export interface HmisRevertPayload {
  mrn: string;
  accession?: string;
  moduleId?: string;
}

export interface HmisDispatchResult {
  success: boolean;
  mrn?: string;
  accession?: string;
  investigationId?: string;
  status?: string;
  verified?: boolean;
  auditScreenshot?: string;
  error?: string;
  savedAt?: string;
}

/**
 * Saves report to local durable vault first, then dispatches draft to HMIS Gateway.
 */
export async function dispatchHmisDraft(
  payload: HmisDraftPayload,
  credentials?: { username?: string; hospitalId?: string; password?: string; reportingDoctorName?: string }
): Promise<HmisDispatchResult> {
  const { mrn, accession = '' } = payload;
  if (!mrn) {
    return { success: false, error: 'Patient MRN is required for HMIS draft' };
  }

  const effectivePgrName = payload.pgrName || credentials?.reportingDoctorName || '';

  // Invariant: Durable Local Vault First
  const vaultId = crypto.randomUUID();
  try {
    const cleanFindings = stripClinicalCommentMarks(payload.findings || '');
    const cleanImpression = stripClinicalCommentMarks(payload.impression || '');

    await db.insert(hmisDraftVault).values({
      id: vaultId,
      accession: accession || 'UNKNOWN',
      patientMrn: mrn,
      moduleId: payload.moduleId || 'auto',
      technique: payload.technique || '',
      findings: cleanFindings,
      impression: cleanImpression,
      clinicalHistory: payload.clinicalHistory || '',
      pgrName: effectivePgrName,
      consultantName: payload.consultantName || '',
      status: 'pending_gateway',
      createdAt: new Date(),
    });
  } catch (err: any) {
    console.warn('[VAULT_WARN] Local vault insert note:', err.message);
  }

  // Gateway dispatch with 75s timeout for complete save and deep read-back verification
  try {
    const cleanFindings = stripClinicalCommentMarks(payload.findings || '');
    const cleanImpression = stripClinicalCommentMarks(payload.impression || '');

    const res = await fetch(`${getGatewayBase()}/api/radiology/draft`, {
      method: 'POST',
      headers: getGatewayHeaders(credentials),
      body: JSON.stringify({
        ...payload,
        findings: cleanFindings,
        impression: cleanImpression,
        pgrName: effectivePgrName,
      }),
      signal: AbortSignal.timeout(120000),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || `HMIS Gateway responded with status ${res.status}`,
      };
    }

    // Update vault and study status
    try {
      await db.update(hmisDraftVault).set({ status: 'saved_draft' }).where(eq(hmisDraftVault.id, vaultId));
      if (accession) {
        const studyUpdate: any = {
          hmisStatus: 'draft',
          hmisLastCheckedAt: new Date(),
        };
        const returnedInvId = data.data?.investigationId || payload.investigationId;
        if (returnedInvId) {
          studyUpdate.hmisInvestigationId = returnedInvId;
        }
        await db.update(studies).set(studyUpdate).where(eq(studies.accessionNumber, accession.toUpperCase()));
      }

      // Automatically capture verified registration demographics from HMIS Add Result modal
      if (data.data?.demographics) {
        const demo = data.data.demographics;
        const patientRows = await db.select().from(patients).where(eq(patients.mrNumber, mrn)).limit(1);
        if (patientRows.length > 0) {
          const pat = patientRows[0];
          const patUpdates: any = {
            updatedAt: new Date().toISOString(),
          };
          if (demo.phone && !pat.phone) patUpdates.phone = demo.phone;
          if (demo.cnic && !pat.cnic) patUpdates.cnic = demo.cnic;
          if (demo.gender && (!pat.gender || pat.gender === 'Other')) patUpdates.gender = demo.gender;
          if (typeof demo.age === 'number' && demo.age > 0) {
            patUpdates.hmisAge = demo.age;
            if (!pat.dicomAge && pat.age > 0) {
              patUpdates.dicomAge = pat.age;
            }
          }
          await db.update(patients).set(patUpdates).where(eq(patients.id, pat.id));
        }
      }
    } catch (syncErr: any) {
      console.warn('[HMIS_SYNC_WARN] Local study status update notice:', syncErr.message);
    }

    return {
      success: true,
      mrn,
      accession,
      investigationId: data.data?.investigationId || payload.investigationId,
      status: data.data?.status || 'DRAFT_SAVED',
      verified: data.data?.verified,
      auditScreenshot: data.data?.auditScreenshot,
      savedAt: data.data?.savedAt || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `HMIS Gateway draft dispatch failed: ${err.message}`,
    };
  }
}

/**
 * Reverts patient draft in HMIS back to the module's default template.
 */
export async function dispatchHmisRevert(
  payload: HmisRevertPayload,
  credentials?: { username?: string; hospitalId?: string; password?: string }
): Promise<HmisDispatchResult> {
  const { mrn, accession = '' } = payload;
  if (!mrn) {
    return { success: false, error: 'Patient MRN is required to revert draft' };
  }

  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/revert`, {
      method: 'POST',
      headers: getGatewayHeaders(credentials),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || `HMIS Gateway revert failed (${res.status})`,
      };
    }

    try {
      if (accession) {
        await db.update(studies).set({
          hmisStatus: 'awaiting_report',
          hmisLastCheckedAt: new Date(),
        }).where(eq(studies.accessionNumber, accession.toUpperCase()));
        await db.update(hmisDraftVault).set({ status: 'reverted' }).where(eq(hmisDraftVault.accession, accession));
      }
    } catch (syncErr: any) {
      console.warn('[HMIS_REVERT_SYNC_WARN] Study revert status update note:', syncErr.message);
    }

    return {
      success: true,
      mrn,
      accession,
      status: data.data?.status || 'REVERTED_TO_DEFAULT',
      auditScreenshot: data.data?.auditScreenshot,
      savedAt: data.data?.revertedAt || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `HMIS Gateway revert error: ${err.message}`,
    };
  }
}

/**
 * Finalizes and submits radiology report to Punjab HMIS Gateway.
 * Safety Invariant: Hard-locked unless config.hmisAllowFinalSubmit is true.
 */
export async function dispatchHmisSubmit(
  payload: HmisDraftPayload,
  credentials?: { username?: string; hospitalId?: string; password?: string; reportingDoctorName?: string }
): Promise<HmisDispatchResult> {
  if (!config.hmisAllowFinalSubmit) {
    return {
      success: false,
      error: 'HMIS Final Submission is locked by clinical safety policy. Only draft saves are currently permitted.',
    };
  }

  const { mrn, accession = '' } = payload;
  if (!mrn) {
    return { success: false, error: 'Patient MRN is required for HMIS submit' };
  }

  const effectivePgrName = payload.pgrName || credentials?.reportingDoctorName || '';

  // Invariant: Durable Local Vault First
  const vaultId = crypto.randomUUID();
  try {
    await db.insert(hmisDraftVault).values({
      id: vaultId,
      accession: accession || 'UNKNOWN',
      patientMrn: mrn,
      moduleId: payload.moduleId || 'auto',
      technique: payload.technique || '',
      findings: payload.findings || '',
      impression: payload.impression || '',
      clinicalHistory: payload.clinicalHistory || '',
      pgrName: effectivePgrName,
      consultantName: payload.consultantName || '',
      status: 'pending_submit',
      createdAt: new Date(),
    });
  } catch (err: any) {
    console.warn('[VAULT_WARN] Local vault insert note:', err.message);
  }

  try {
    const res = await fetch(`${getGatewayBase()}/api/radiology/submit-result`, {
      method: 'POST',
      headers: getGatewayHeaders(credentials),
      body: JSON.stringify({
        ...payload,
        pgrName: effectivePgrName,
        action: 'submit',
      }),
      signal: AbortSignal.timeout(120000),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || `HMIS Gateway submit failed with status ${res.status}`,
      };
    }

    try {
      await db.update(hmisDraftVault).set({ status: 'submitted' }).where(eq(hmisDraftVault.id, vaultId));
      if (accession) {
        await db.update(studies).set({
          hmisStatus: 'submitted',
          hmisLastCheckedAt: new Date(),
        }).where(eq(studies.accessionNumber, accession.toUpperCase()));
      }
    } catch (syncErr: any) {
      console.warn('[HMIS_SYNC_WARN] Study status update note:', syncErr.message);
    }

    return {
      success: true,
      mrn,
      accession,
      investigationId: data.data?.investigationId || payload.investigationId,
      status: 'SUBMITTED',
      verified: data.data?.verified,
      auditScreenshot: data.data?.auditScreenshot,
      savedAt: data.data?.savedAt || new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `HMIS Gateway submit dispatch failed: ${err.message}`,
    };
  }
}

