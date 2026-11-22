// Layer 2: Case Sync Bundle Extraction Service
import { db } from '@/db';
import { patients, studies, reports, reportRevisions, tombstonedAccessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { CaseSyncBundle, CaseSyncPatient, CaseSyncStudy, CaseSyncReport, CaseSyncSeriesItem } from './case-sync-types';

/**
 * Extracts a complete relational case bundle from the database.
 */
export async function buildCaseBundle(accessionNumber: string): Promise<CaseSyncBundle | null> {
  const normAcc = accessionNumber.trim().toUpperCase();

  // Check tombstone first
  const [tombstone] = await db
    .select()
    .from(tombstonedAccessions)
    .where(eq(tombstonedAccessions.accession, normAcc))
    .limit(1);

  if (tombstone) {
    return {
      accessionNumber: normAcc,
      action: 'delete',
      patient: { mrNumber: 'UNKNOWN', fullName: 'DELETED', age: 0, gender: 'Other', updatedAt: tombstone.deletedAt },
      study: { accessionNumber: normAcc, patientMrn: 'UNKNOWN', modality: 'RAD', scanType: 'Deleted', bodyPart: 'Unknown', priority: 'routine', status: 'cancelled', scheduledAt: tombstone.deletedAt, updatedAt: tombstone.deletedAt },
      tombstoned: true,
      tombstoneReason: tombstone.reason || 'user_deleted',
      tombstoneDeletedAt: tombstone.deletedAt,
      clientTimestamp: new Date().toISOString(),
    };
  }

  const [st] = await db.select().from(studies).where(eq(studies.accessionNumber, normAcc)).limit(1);
  if (!st) return null;

  const [pat] = await db.select().from(patients).where(eq(patients.id, st.patientId)).limit(1);
  const patientMrn = pat?.mrNumber || `MRN-${normAcc}`;

  const patientData: CaseSyncPatient = {
    id: pat?.id,
    mrNumber: patientMrn,
    fullName: pat?.fullName || 'Anonymous Patient',
    dob: pat?.dob || undefined,
    age: pat?.age ?? 0,
    gender: pat?.gender || 'Male',
    phone: pat?.phone || undefined,
    cnic: pat?.cnic || undefined,
    guardianName: pat?.guardianName || undefined,
    address: pat?.address || undefined,
    bloodGroup: pat?.bloodGroup || undefined,
    allergies: pat?.allergies || undefined,
    clinicalNotes: pat?.clinicalNotes || undefined,
    createdAt: pat?.createdAt ? String(pat.createdAt) : undefined,
    updatedAt: pat?.updatedAt ? String(pat.updatedAt) : new Date().toISOString(),
  };

  let reportData: CaseSyncReport | undefined;
  const [rep] = await db.select().from(reports).where(eq(reports.studyId, st.id)).limit(1);

  const nowIso = new Date().toISOString();
  const hasActiveDoctorWork = Boolean(st.assignedRadiologistId || st.claimedAt || rep);
  const effectiveStudyUpdatedAt = hasActiveDoctorWork
    ? nowIso
    : (st.updatedAt ? String(st.updatedAt) : nowIso);

  const studyData: CaseSyncStudy = {
    id: st.id,
    accessionNumber: normAcc,
    patientMrn,
    modality: st.modality,
    scanType: st.scanType,
    bodyPart: st.bodyPart,
    priority: st.priority,
    status: st.status,
    scheduledAt: st.scheduledAt ? String(st.scheduledAt) : nowIso,
    referringDoctor: st.referringDoctor || undefined,
    technologist: st.technologist || undefined,
    contrastUsed: Boolean(st.contrastUsed),
    contrastAgent: st.contrastAgent || undefined,
    contrastVolumeMl: st.contrastVolumeMl || undefined,
    machineId: st.machineId || undefined,
    assignedRadiologistId: (st.assignedRadiologistId === 'usr_admin_mudassir' || st.assignedRadiologistId === 'usr-admin-mudassir')
      ? '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a'
      : (st.assignedRadiologistId || undefined),
    claimedAt: st.claimedAt ? String(st.claimedAt) : undefined,
    department: st.department || undefined,
    room: st.room || undefined,
    clinicalHistory: st.clinicalHistory || undefined,
    hmisInvestigationId: st.hmisInvestigationId || undefined,
    hmisCpt: st.hmisCpt || undefined,
    hmisMilestonesJson: st.hmisMilestonesJson || undefined,
    hmisStatus: st.hmisStatus || undefined,
    isManual: Boolean(st.isManual),
    createdAt: st.createdAt ? String(st.createdAt) : undefined,
    updatedAt: effectiveStudyUpdatedAt,
  };

  if (rep) {
    const revs = await db
      .select()
      .from(reportRevisions)
      .where(eq(reportRevisions.reportId, rep.id))
      .orderBy(desc(reportRevisions.version));

    reportData = {
      id: rep.id,
      accessionNumber: normAcc,
      authorId: (rep.authorId === 'usr_admin_mudassir' || rep.authorId === 'usr-admin-mudassir')
        ? '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a'
        : (rep.authorId || undefined),
      status: rep.status,
      clinicalHistory: rep.clinicalHistory || undefined,
      technique: rep.technique || undefined,
      comparison: rep.comparison || undefined,
      findings: rep.findings || undefined,
      impression: rep.impression || undefined,
      recommendation: rep.recommendation || undefined,
      criticalFinding: Boolean(rep.criticalFinding),
      signedBy: rep.signedBy || undefined,
      signedAt: rep.signedAt ? String(rep.signedAt) : undefined,
      pendingReason: rep.pendingReason || undefined,
      pendingNotes: rep.pendingNotes || undefined,
      pendingAt: rep.pendingAt ? String(rep.pendingAt) : undefined,
      pendingBy: rep.pendingBy || undefined,
      contentJson: rep.contentJson || undefined,
      createdAt: rep.createdAt ? String(rep.createdAt) : undefined,
      updatedAt: rep.updatedAt ? String(rep.updatedAt) : new Date().toISOString(),
      revisions: revs.map((r) => ({
        version: r.version,
        authorId: r.authorId || undefined,
        authorName: r.authorName || undefined,
        authorRole: r.authorRole || undefined,
        status: r.status,
        findings: r.findings || undefined,
        impression: r.impression || undefined,
        technique: r.technique || undefined,
        recommendation: r.recommendation || undefined,
        notes: r.notes || undefined,
        createdAt: String(r.createdAt),
      })),
    };
  }

  const seriesData: CaseSyncSeriesItem[] = [];
  if (st.dicomSeriesInstanceUid) {
    seriesData.push({
      seriesInstanceUid: st.dicomSeriesInstanceUid,
      modality: st.modality || 'MR',
      seriesDescription: st.scanType || st.bodyPart || 'Diagnostic Scan Series',
      numInstances: st.numInstances || 1,
      bodyPart: st.bodyPart || undefined,
    });
  }

  return {
    accessionNumber: normAcc,
    action: 'upsert',
    patient: patientData,
    study: studyData,
    report: reportData,
    series: seriesData.length > 0 ? seriesData : undefined,
    reportingUserId: st.assignedRadiologistId || undefined,
    clientTimestamp: new Date().toISOString(),
  };
}
