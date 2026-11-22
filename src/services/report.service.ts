// Layer 2 (Domain/Services): Central Report Persistence & Workflow Synchronization
import crypto from 'crypto';
import { db } from '@/db';
import { reports, studies, patients, reportRevisions } from '@/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import { resolvePatientByMrn } from './mrn-resolution.service';
import { validateReportTransition } from './report-state-machine.service';
import { logAudit } from './audit.service';
import { recordReportRevision, getReportRevisions, restoreReportRevision } from './report-revision.service';
import { extractDiagnosisHighlight } from '@/lib/clinical-summary';
import { generateAiDiagnosisHighlight } from './ai-clinical-summary.service';
import type { ReportStatus } from '@/types';

export interface SaveReportInput {
  reportId?: string;
  studyId?: string;
  accessionNumber?: string;
  patientId?: string;
  patientMrn?: string;
  patientName?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  modality?: string;
  studyDescription?: string;
  clinicalHistory?: string;
  technique?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  recommendation?: string;
  contentJson?: any;
  status?: ReportStatus;
  criticalFinding?: boolean;
  pendingReason?: string | null;
  pendingNotes?: string | null;
  pgrDraftFindings?: string;
  pgrDraftImpression?: string;
  isAutoSave?: boolean;
  milestoneTag?: string;
  discussionJson?: any;
}

export interface ManualCaseInput {
  patientName: string;
  patientMrn?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  modality: string;
  studyDescription: string;
  priority?: 'routine' | 'urgent' | 'stat';
  clinicalHistory?: string;
  referringDoctor?: string;
}

export interface UserContext {
  id: string;
  name: string;
  role: string;
  title?: string;
}

export async function saveReport(
  input: SaveReportInput,
  user: UserContext
): Promise<{ success: boolean; reportId: string; version: number; isNewVersion: boolean; status: ReportStatus; message?: string }> {
  // 1. Resolve Study and Patient deterministically to ensure foreign key integrity
  let resolvedStudy: any = null;
  if (input.studyId && input.studyId.length > 10 && !input.studyId.startsWith('LOCAL_')) {
    const [s] = await db.select().from(studies).where(eq(studies.id, input.studyId)).limit(1);
    resolvedStudy = s;
  }

  if (!resolvedStudy && input.accessionNumber) {
    const [s] = await db.select().from(studies).where(eq(studies.accessionNumber, input.accessionNumber.trim().toUpperCase())).limit(1);
    resolvedStudy = s;
  }

  if (!resolvedStudy) {
    const targetMrn = input.patientMrn || `MRN-${Date.now()}`;
    const patient = await resolvePatientByMrn({
      mrn: targetMrn,
      fullName: input.patientName || 'Anonymous Patient',
      age: input.age ?? 45,
      gender: input.gender || 'Male',
    });

    const newStudyId = crypto.randomUUID();
    const targetAcc = (input.accessionNumber || `ACC-${Date.now()}`).trim().toUpperCase();
    await db.insert(studies).values({
      id: newStudyId,
      patientId: patient.id,
      accessionNumber: targetAcc,
      modality: input.modality || 'CT',
      scanType: input.studyDescription || 'Radiological Examination',
      bodyPart: input.modality === 'MR' || input.modality === 'MRI' ? 'Spine / Brain' : 'Body',
      priority: input.criticalFinding ? 'stat' : 'routine',
      status: 'scheduled',
      clinicalHistory: input.clinicalHistory || '',
      scheduledAt: new Date(),
      createdAt: new Date(),
    } as any);

    resolvedStudy = { id: newStudyId, patientId: patient.id, accessionNumber: targetAcc };
  }

  // 2. Resolve Existing Report by ID or Study ID
  let existingReport: any = null;
  if (input.reportId && input.reportId !== 'new') {
    const [r] = await db.select().from(reports).where(eq(reports.id, input.reportId)).limit(1);
    existingReport = r;
  }
  if (!existingReport && resolvedStudy?.id) {
    const [r] = await db.select().from(reports).where(eq(reports.studyId, resolvedStudy.id)).limit(1);
    existingReport = r;
  }

  const currentStatus = (existingReport?.status || 'draft') as ReportStatus;
  const targetStatus = (input.status || currentStatus) as ReportStatus;

  // 3. Clinical state machine validation & report ownership guard
  if (user.role !== 'admin') {
    const isAssignedToOther = resolvedStudy?.assignedRadiologistId && resolvedStudy.assignedRadiologistId !== user.id;
    const isUnclaimed = !resolvedStudy?.assignedRadiologistId;

    if (input.isAutoSave) {
      if (isAssignedToOther) {
        return {
          success: false,
          reportId: existingReport?.id || '',
          version: 1,
          isNewVersion: false,
          status: currentStatus,
          message: 'Case claimed by another doctor: auto-save disabled',
        };
      }
      if (isUnclaimed) {
        return {
          success: false,
          reportId: existingReport?.id || '',
          version: 1,
          isNewVersion: false,
          status: currentStatus,
          message: 'Case not taken up: auto-save disabled in observation mode',
        };
      }
    } else {
      // Explicit manual save action: check collision
      if (isAssignedToOther) {
        throw new Error('Case lock: You cannot edit a report claimed by another radiologist.');
      }
      // If unclaimed, atomically claim for current doctor upon manual save
      if (isUnclaimed && resolvedStudy?.id && user.id) {
        try {
          await db.update(studies).set({
            assignedRadiologistId: user.id,
            assignedRadiologistName: user.name,
            claimedAt: new Date().toISOString(),
          } as any).where(eq(studies.id, resolvedStudy.id));
          resolvedStudy.assignedRadiologistId = user.id;
          resolvedStudy.assignedRadiologistName = user.name;
        } catch {}
      }
    }
  }

  if (existingReport) {
    const transition = validateReportTransition(currentStatus, targetStatus, user.role as any);
    if (!transition.allowed) {
      throw new Error(transition.reason || 'Unauthorized report state transition.');
    }
  }

  // 4. Prepare update payload
  const rawImpression = input.impression ?? existingReport?.impression ?? '';
  const rawFindings = input.findings ?? existingReport?.findings ?? '';
  let initialHighlight = existingReport?.diagnosisHighlight;
  if (rawImpression || rawFindings) {
    initialHighlight = extractDiagnosisHighlight(rawImpression || rawFindings) || undefined;
  }

  const updateData: Record<string, unknown> = {
    technique: input.technique ?? existingReport?.technique ?? '',
    comparison: input.comparison ?? existingReport?.comparison ?? '',
    findings: input.findings ?? existingReport?.findings ?? '',
    impression: input.impression ?? existingReport?.impression ?? '',
    recommendation: input.recommendation ?? existingReport?.recommendation ?? '',
    criticalFinding: Boolean(input.criticalFinding),
    status: targetStatus,
    diagnosisHighlight: initialHighlight,
    updatedAt: new Date(),
  };

  if (input.clinicalHistory !== undefined) {
    updateData.clinicalHistory = input.clinicalHistory;
  }

  if (input.contentJson) updateData.contentJson = input.contentJson;
  if (input.discussionJson !== undefined) {
    updateData.discussionJson =
      typeof input.discussionJson === 'object' ? JSON.stringify(input.discussionJson) : input.discussionJson;
  }
  if (input.pendingReason !== undefined) {
    updateData.pendingReason = input.pendingReason;
    updateData.pendingNotes = input.pendingNotes ?? '';
    updateData.pendingAt = input.pendingReason ? new Date() : null;
    updateData.pendingBy = input.pendingReason ? user.name : null;
  }
  if (targetStatus === 'submitted') {
    updateData.submittedAt = new Date();
    updateData.submittedBy = (user as any).hmisReportingDoctorName || `${user.name} (${user.title || 'PGR'})`;
    updateData.pgrDraftFindings = input.findings ?? existingReport?.findings ?? '';
    updateData.pgrDraftImpression = input.impression ?? existingReport?.impression ?? '';
    updateData.pgrAuthorId = user.id;
    updateData.pgrSubmittedAt = new Date();
  } else if (targetStatus === 'final') {
    updateData.signedAt = new Date();
    const designation = user.title || (user.role === 'resident' || user.role === 'pgr' ? 'PGR' : 'Consultant Radiologist');
    updateData.signedBy = (user as any).hmisReportingDoctorName || `${user.name} (${designation})`;
  }

  let finalReportId = existingReport?.id;

  if (existingReport) {
    await db.update(reports).set(updateData).where(eq(reports.id, existingReport.id));
  } else {
    finalReportId = crypto.randomUUID();
    await db.insert(reports).values({
      id: finalReportId,
      studyId: resolvedStudy.id,
      patientId: resolvedStudy.patientId,
      authorId: user.id || '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
      createdAt: new Date(),
      ...updateData,
    } as any);
  }

  // Asynchronously trigger AI diagnosis highlight synthesis using configured provider (OpenRouter/Local)
  if (finalReportId && (rawImpression || rawFindings)) {
    generateAiDiagnosisHighlight(rawFindings, rawImpression)
      .then(async (aiHighlight) => {
        if (aiHighlight && aiHighlight !== initialHighlight) {
          try {
            await db
              .update(reports)
              .set({ diagnosisHighlight: aiHighlight, updatedAt: new Date() })
              .where(eq(reports.id, finalReportId));
          } catch {}
        }
      })
      .catch(() => {});
  }

  // 4b. Record immutable version snapshot in report_revisions table
  let revisionInfo = { created: false, version: 1 };
  try {
    revisionInfo = await recordReportRevision({
      reportId: finalReportId,
      updateData: {
        findings: String(updateData.findings || ''),
        impression: String(updateData.impression || ''),
        technique: String(updateData.technique || ''),
        recommendation: String(updateData.recommendation || ''),
      },
      user,
      status: targetStatus,
      milestoneTag: input.milestoneTag || (input.pendingNotes as string),
      isAutoSave: Boolean(input.isAutoSave),
    });
  } catch (revErr) {
    console.warn('Could not record report revision:', revErr);
  }

  // 5. Synchronize Parent Study Status & Priority
  const studyUpdate: Record<string, unknown> = {};
  if (targetStatus === 'final' || targetStatus === 'amended') {
    studyUpdate.status = 'reported';
  } else if (targetStatus === 'preliminary' || targetStatus === 'submitted') {
    studyUpdate.status = 'in-progress';
  } else if (targetStatus === 'pending') {
    studyUpdate.status = 'pending';
  } else if (targetStatus === 'draft' || targetStatus === 'scheduled') {
    studyUpdate.status = 'scheduled';
  }
  if (input.criticalFinding) {
    studyUpdate.priority = 'stat';
  }
  if (input.clinicalHistory !== undefined) {
    studyUpdate.clinicalHistory = input.clinicalHistory;
  }
  if (Object.keys(studyUpdate).length > 0 && resolvedStudy?.id) {
    await db.update(studies).set(studyUpdate).where(eq(studies.id, resolvedStudy.id));
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: targetStatus === 'final' ? 'SIGN_REPORT' : targetStatus === 'amended' ? 'AMEND_REPORT' : 'SAVE_REPORT',
    entityType: 'Report',
    entityId: finalReportId,
    details: `Saved report ${finalReportId} for accession ${resolvedStudy.accessionNumber} with status '${targetStatus}'`,
  });

  // 6. Trigger non-blocking multi-destination report sync across all enabled providers (SQLite, S3, PostgreSQL, Google Docs)
  (async () => {
    try {
      const { dispatchReportSync } = await import('./report-sync/report-sync-dispatcher.service');
      await dispatchReportSync(finalReportId, user.id);
    } catch (syncErr) {
      console.warn('[REPORT_SYNC_DISPATCH_WARN]', syncErr);
    }
  })();

  // 7. Enqueue case for offline-first VPS synchronization
  (async () => {
    try {
      const { enqueueCaseSync } = await import('./sync/case-sync-outbox.service');
      await enqueueCaseSync(resolvedStudy.accessionNumber, 'upsert');
    } catch (err) {
      console.warn('[CASE_SYNC_ENQUEUE_WARN]', err);
    }
  })();

  return {
    success: true,
    reportId: finalReportId,
    version: revisionInfo.version,
    isNewVersion: revisionInfo.created,
    status: targetStatus,
    message: `Report successfully saved with status '${targetStatus}'.`,
  };
}

export { createManualCaseAndReport, getReportByStudyOrAccession } from './report-queries.service';

export async function setReportPending(
  input: { reportId?: string; studyId?: string; accessionNumber?: string; pendingReason?: string | null; pendingNotes?: string | null },
  user: UserContext
) {
  return saveReport(
    {
      reportId: input.reportId,
      studyId: input.studyId,
      accessionNumber: input.accessionNumber,
      pendingReason: input.pendingReason,
      pendingNotes: input.pendingNotes,
      status: (input.pendingReason ? 'pending' : 'draft') as any,
    },
    user
  );
}

export { getReportRevisions, restoreReportRevision } from './report-revision.service';


