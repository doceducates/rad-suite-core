// Layer 2 (Domain/Services): Manual Case Merge & HMIS Collision Reconciliation
import crypto from 'crypto';
import { db } from '@/db';
import { studies, reports, patients } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { logAudit } from './audit.service';
import type { UserContext } from './patient-management.service';

export interface MergeCaseInput {
  sourceAccession: string;
  targetAccession: string;
  notes?: string;
}

export interface MergeCandidate {
  accessionNumber: string;
  patientName: string;
  patientMrn: string;
  modality: string;
  studyDescription: string;
  scheduledAt: string;
  status: string;
  hmisStatus?: string | null;
  isManual?: boolean;
}

/**
 * Retrieves candidate studies sharing the same MRN for collision reconciliation.
 */
export async function getMergeCandidatesForMrn(mrn: string): Promise<MergeCandidate[]> {
  const normMrn = (mrn || '').trim().toLowerCase();
  if (!normMrn) return [];

  const rows = await db
    .select({
      study: studies,
      patient: patients,
    })
    .from(studies)
    .innerJoin(patients, eq(patients.id, studies.patientId))
    .where(eq(sql`lower(${patients.mrNumber})`, normMrn));

  return rows.map((r) => ({
    accessionNumber: r.study.accessionNumber,
    patientName: r.patient.fullName,
    patientMrn: r.patient.mrNumber,
    modality: r.study.modality,
    studyDescription: r.study.scanType,
    scheduledAt: r.study.scheduledAt ? new Date(r.study.scheduledAt).toISOString() : new Date().toISOString(),
    status: r.study.status,
    hmisStatus: r.study.hmisStatus,
    isManual: Boolean((r.study as any).isManual || r.study.accessionNumber.startsWith('MAN-')),
  }));
}

/**
 * Merges a manual draft case findings and impressions into an official HMIS study.
 */
export async function mergeManualCaseToHmis(
  input: MergeCaseInput,
  user?: UserContext
): Promise<{
  success: boolean;
  sourceAccession: string;
  targetAccession: string;
  targetStudyId: string;
  message: string;
}> {
  const sourceAcc = input.sourceAccession.trim();
  const targetAcc = input.targetAccession.trim();

  if (!sourceAcc || !targetAcc) {
    throw new Error('Both sourceAccession and targetAccession are required for merge.');
  }

  if (sourceAcc.toLowerCase() === targetAcc.toLowerCase()) {
    throw new Error('Cannot merge a case into itself.');
  }

  // 1. Locate Source Study
  const [sourceStudy] = await db
    .select()
    .from(studies)
    .where(eq(sql`lower(${studies.accessionNumber})`, sourceAcc.toLowerCase()))
    .limit(1);

  if (!sourceStudy) {
    throw new Error(`Source case "${sourceAcc}" not found in database.`);
  }

  // 2. Locate Target Study
  const [targetStudy] = await db
    .select()
    .from(studies)
    .where(eq(sql`lower(${studies.accessionNumber})`, targetAcc.toLowerCase()))
    .limit(1);

  if (!targetStudy) {
    throw new Error(`Target official case "${targetAcc}" not found in database.`);
  }

  // 3. Locate Source Report
  const [sourceReport] = await db
    .select()
    .from(reports)
    .where(eq(reports.studyId, sourceStudy.id))
    .limit(1);

  // 4. Locate Target Report
  const [targetReport] = await db
    .select()
    .from(reports)
    .where(eq(reports.studyId, targetStudy.id))
    .limit(1);

  // 5. Transfer Diagnostic Content
  if (sourceReport) {
    const findingsToTransfer = sourceReport.findings || '';
    const impressionToTransfer = sourceReport.impression || '';
    const techniqueToTransfer = sourceReport.technique || '';
    const clinicalHistoryToTransfer = sourceReport.clinicalHistory || '';
    const recommendationToTransfer = sourceReport.recommendation || '';
    const pgrFindingsToTransfer = (sourceReport as any).pgrDraftFindings || '';
    const pgrImpressionToTransfer = (sourceReport as any).pgrDraftImpression || '';
    const pgrAuthorToTransfer = (sourceReport as any).pgrAuthorId || null;

    if (targetReport) {
      // Merge into existing target report
      await db
        .update(reports)
        .set({
          findings: targetReport.findings && targetReport.findings.trim().length > 0
            ? `${targetReport.findings}\n\n[From Case ${sourceAcc}]:\n${findingsToTransfer}`
            : findingsToTransfer,
          impression: targetReport.impression && targetReport.impression.trim().length > 0
            ? `${targetReport.impression}\n\n[From Case ${sourceAcc}]:\n${impressionToTransfer}`
            : impressionToTransfer,
          technique: targetReport.technique || techniqueToTransfer,
          clinicalHistory: targetReport.clinicalHistory || clinicalHistoryToTransfer,
          recommendation: targetReport.recommendation || recommendationToTransfer,
          pgrDraftFindings: (targetReport as any).pgrDraftFindings || pgrFindingsToTransfer,
          pgrDraftImpression: (targetReport as any).pgrDraftImpression || pgrImpressionToTransfer,
          pgrAuthorId: (targetReport as any).pgrAuthorId || pgrAuthorToTransfer,
          status: targetReport.status === 'scheduled' || targetReport.status === 'awaiting_report'
            ? 'draft'
            : targetReport.status,
          updatedAt: new Date(),
        } as any)
        .where(eq(reports.id, targetReport.id));
    } else {
      // Create new draft report for target study
      await db.insert(reports).values({
        id: crypto.randomUUID(),
        studyId: targetStudy.id,
        patientId: targetStudy.patientId,
        authorId: user?.id || sourceReport.authorId || '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
        status: 'draft',
        technique: techniqueToTransfer,
        findings: findingsToTransfer,
        impression: impressionToTransfer,
        clinicalHistory: clinicalHistoryToTransfer,
        recommendation: recommendationToTransfer,
        pgrDraftFindings: pgrFindingsToTransfer,
        pgrDraftImpression: pgrImpressionToTransfer,
        pgrAuthorId: pgrAuthorToTransfer,
        criticalFinding: Boolean((sourceReport as any).criticalFinding),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }
  }

  // 6. Update Target Study Assignment & Status
  await db
    .update(studies)
    .set({
      assignedRadiologistId: sourceStudy.assignedRadiologistId || user?.id || targetStudy.assignedRadiologistId,
      claimedAt: sourceStudy.claimedAt || new Date(),
      clinicalHistory: targetStudy.clinicalHistory || sourceStudy.clinicalHistory || '',
      status: targetStudy.status === 'scheduled' || targetStudy.status === 'awaiting_report'
        ? 'in_progress'
        : targetStudy.status,
    } as any)
    .where(eq(studies.id, targetStudy.id));

  // 7. Reconcile HMIS Draft Vault Entries to Target Accession
  try {
    const { hmisDraftVault } = await import('@/db/schema');
    const [targetPatient] = await db.select().from(patients).where(eq(patients.id, targetStudy.patientId)).limit(1);
    await db
      .update(hmisDraftVault)
      .set({
        accession: targetAcc,
        patientMrn: targetPatient?.mrNumber || '',
        patientName: targetPatient?.fullName || '',
      })
      .where(eq(hmisDraftVault.accession, sourceAcc));
  } catch {}

  // 8. Archive / Flag Source Study as Merged/Shifted & unassign so it leaves My Cases
  await db
    .update(studies)
    .set({
      status: 'cancelled',
      assignedRadiologistId: null,
      claimedAt: null,
      clinicalHistory: `${sourceStudy.clinicalHistory || ''} [REPORT SHIFTED to ${targetAcc}]`.trim(),
    } as any)
    .where(eq(studies.id, sourceStudy.id));

  // Mark source report as cancelled so no stale draft status is retained
  if (sourceReport) {
    await db
      .update(reports)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      } as any)
      .where(eq(reports.id, sourceReport.id));
  }

  // 9. Audit Logging
  await logAudit({
    userId: user?.id,
    userName: user?.name || 'System',
    action: 'SHIFT_REPORT_ACCESSION',
    entityType: 'Study',
    entityId: targetAcc,
    details: `Shifted report and findings from case ${sourceAcc} into study ${targetAcc}. Notes: ${input.notes || 'None'}`,
  });

  return {
    success: true,
    sourceAccession: sourceAcc,
    targetAccession: targetAcc,
    targetStudyId: targetStudy.id,
    message: `Successfully merged manual case ${sourceAcc} into ${targetAcc}.`,
  };
}
