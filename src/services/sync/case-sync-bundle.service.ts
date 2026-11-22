// Layer 2: Case Sync Bundle Packing & Conflict-Safe Ingestion Service
import crypto from 'crypto';
import { db } from '@/db';
import { patients, studies, reports, reportRevisions, tombstonedAccessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { parseDateSafely, parseDateOrNull } from '@/lib/date-utils';
import type { CaseSyncBundle } from './case-sync-types';
import { logAudit } from '../audit.service';
import { recordSyncChange } from './sync-changelog.service';

export { buildCaseBundle } from './case-sync-builder.service';

function normalizeDoctorId(id?: string | null): string | null {
  if (!id) return null;
  if (id === 'usr_admin_mudassir' || id === 'usr-admin-mudassir') {
    return '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a';
  }
  return id;
}

/**
 * Ingests a case bundle using topological upserts and non-destructive revision conflict resolution.
 */
export async function applyCaseBundle(
  bundle: CaseSyncBundle,
  requestingUser?: any
): Promise<{
  success: boolean;
  accessionNumber: string;
  conflict?: { reason: string; archivedVersion?: number };
}> {
  const normAcc = bundle.accessionNumber.trim().toUpperCase();

  // 1. Handle Tombstones / Deletions
  if (bundle.action === 'delete' || bundle.tombstoned) {
    await db
      .insert(tombstonedAccessions)
      .values({
        id: crypto.randomUUID(),
        accession: normAcc,
        reason: bundle.tombstoneReason || 'remote_sync_deletion',
        deletedAt: bundle.tombstoneDeletedAt || new Date().toISOString(),
        deletedBy: 'remote_sync',
      } as any)
      .onConflictDoNothing();

    // Delete local study if present
    const [st] = await db.select().from(studies).where(eq(studies.accessionNumber, normAcc)).limit(1);
    if (st) {
      await db.delete(studies).where(eq(studies.id, st.id));
    }
    await recordSyncChange({ tableName: 'studies', entityId: normAcc, operation: 'DELETE' });
    return { success: true, accessionNumber: normAcc };
  }

  // 2. Ingest Patient (by mrNumber)
  const targetMrn = bundle.patient.mrNumber || `MRN-${normAcc}`;
  let [pat] = await db.select().from(patients).where(eq(patients.mrNumber, targetMrn)).limit(1);

  if (!pat) {
    const patientId = bundle.patient.id || crypto.randomUUID();
    const [created] = await db
      .insert(patients)
      .values({
        id: patientId,
        mrNumber: targetMrn,
        fullName: bundle.patient.fullName,
        dob: bundle.patient.dob || '1980-01-01',
        age: bundle.patient.age ?? 0,
        gender: bundle.patient.gender || 'Male',
        phone: bundle.patient.phone || '',
        cnic: bundle.patient.cnic || '',
        guardianName: bundle.patient.guardianName || '',
        address: bundle.patient.address || '',
        bloodGroup: bundle.patient.bloodGroup || '',
        allergies: bundle.patient.allergies || '',
        clinicalNotes: bundle.patient.clinicalNotes || '',
        createdAt: parseDateSafely(bundle.patient.createdAt),
        updatedAt: parseDateSafely(bundle.patient.updatedAt),
      } as any)
      .returning();
    pat = created;
  } else {
    // Check if incoming is newer or update fields
    const incomingTime = parseDateSafely(bundle.patient.updatedAt || 0).getTime();
    const existingTime = parseDateSafely(pat.updatedAt || pat.createdAt || 0).getTime();
    if (incomingTime >= existingTime) {
      await db
        .update(patients)
        .set({
          fullName: bundle.patient.fullName || pat.fullName,
          age: bundle.patient.age ?? pat.age,
          gender: bundle.patient.gender || pat.gender,
          phone: bundle.patient.phone ?? pat.phone,
          clinicalNotes: bundle.patient.clinicalNotes ?? pat.clinicalNotes,
          updatedAt: parseDateSafely(bundle.patient.updatedAt || Date.now()) as any,
        } as any)
        .where(eq(patients.id, pat.id));
    }
  }

  // 3. Ingest Study (by accessionNumber)
  let [st] = await db.select().from(studies).where(eq(studies.accessionNumber, normAcc)).limit(1);
  const studyId = st?.id || bundle.study.id || crypto.randomUUID();

  if (!st) {
    const [createdStudy] = await db
      .insert(studies)
      .values({
        id: studyId,
        patientId: pat.id,
        accessionNumber: normAcc,
        modality: bundle.study.modality || 'CT',
        scanType: bundle.study.scanType || 'Radiological Examination',
        bodyPart: bundle.study.bodyPart || 'Body',
        priority: bundle.study.priority || 'routine',
        status: bundle.study.status || 'scheduled',
        scheduledAt: parseDateSafely(bundle.study.scheduledAt),
        referringDoctor: bundle.study.referringDoctor || '',
        technologist: bundle.study.technologist || '',
        contrastUsed: Boolean(bundle.study.contrastUsed),
        contrastAgent: bundle.study.contrastAgent || '',
        contrastVolumeMl: bundle.study.contrastVolumeMl || 0,
        machineId: bundle.study.machineId || '',
        assignedRadiologistId: normalizeDoctorId(bundle.study.assignedRadiologistId) || null,
        claimedAt: parseDateOrNull(bundle.study.claimedAt),
        department: bundle.study.department || '',
        room: bundle.study.room || '',
        clinicalHistory: bundle.study.clinicalHistory || '',
        hmisInvestigationId: bundle.study.hmisInvestigationId || null,
        hmisCpt: bundle.study.hmisCpt || null,
        hmisMilestonesJson: bundle.study.hmisMilestonesJson || null,
        hmisStatus: bundle.study.hmisStatus || 'awaiting_report',
        dicomSeriesInstanceUid: (bundle.study as any).dicomSeriesInstanceUid || bundle.series?.[0]?.seriesInstanceUid || null,
        numInstances: (bundle.study as any).numInstances || bundle.series?.reduce((sum, s) => sum + (s.numInstances || 1), 0) || 1,
        isManual: Boolean(bundle.study.isManual),
        createdAt: parseDateSafely(bundle.study.createdAt),
        updatedAt: parseDateSafely(bundle.study.updatedAt),
      } as any)
      .returning();
    st = createdStudy;
  } else {
    const incomingStudyTime = parseDateSafely(bundle.study.updatedAt || 0).getTime();
    const existingStudyTime = parseDateSafely(st.updatedAt || st.createdAt || 0).getTime();
    const shouldUpdateStudy =
      incomingStudyTime >= existingStudyTime ||
      (Boolean(bundle.study.assignedRadiologistId) && !st.assignedRadiologistId) ||
      (bundle.study.status !== 'scheduled' && st.status === 'scheduled');

    if (shouldUpdateStudy) {
      await db
        .update(studies)
        .set({
          status: bundle.study.status || st.status,
          priority: bundle.study.priority || st.priority,
          scanType: bundle.study.scanType || st.scanType,
          bodyPart: bundle.study.bodyPart || st.bodyPart,
          clinicalHistory: bundle.study.clinicalHistory ?? st.clinicalHistory,
          assignedRadiologistId: normalizeDoctorId(bundle.study.assignedRadiologistId) ?? st.assignedRadiologistId,
          claimedAt: parseDateOrNull(bundle.study.claimedAt) ?? st.claimedAt,
          department: bundle.study.department ?? st.department,
          room: bundle.study.room ?? st.room,
          hmisInvestigationId: bundle.study.hmisInvestigationId ?? st.hmisInvestigationId,
          hmisCpt: bundle.study.hmisCpt ?? st.hmisCpt,
          hmisStatus: bundle.study.hmisStatus || st.hmisStatus || 'awaiting_report',
          updatedAt: parseDateSafely(bundle.study.updatedAt || Date.now()) as any,
        } as any)
        .where(eq(studies.id, st.id));
    }
  }

  // 4. Ingest Report & Immutable Revisions (Conflict-Safe)
  let conflictInfo: { reason: string; archivedVersion?: number } | undefined;
  if (bundle.report) {
    const [existingRep] = await db.select().from(reports).where(eq(reports.studyId, st.id)).limit(1);

    if (!existingRep) {
      const newRepId = bundle.report.id || crypto.randomUUID();
      await db.insert(reports).values({
        id: newRepId,
        studyId: st.id,
        patientId: pat.id,
        authorId: normalizeDoctorId(bundle.report.authorId) || '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
        status: bundle.report.status || 'draft',
        clinicalHistory: bundle.report.clinicalHistory || '',
        technique: bundle.report.technique || '',
        comparison: bundle.report.comparison || '',
        findings: bundle.report.findings || '',
        impression: bundle.report.impression || '',
        recommendation: bundle.report.recommendation || '',
        criticalFinding: Boolean(bundle.report.criticalFinding),
        signedBy: bundle.report.signedBy || '',
        signedAt: parseDateOrNull(bundle.report.signedAt),
        pendingReason: bundle.report.pendingReason || null,
        pendingNotes: bundle.report.pendingNotes || '',
        createdAt: parseDateSafely(bundle.report.createdAt),
        updatedAt: parseDateSafely(bundle.report.updatedAt),
      } as any);

      // Ingest revisions if any
      if (bundle.report.revisions && bundle.report.revisions.length > 0) {
        for (const rev of bundle.report.revisions) {
          await db
            .insert(reportRevisions)
            .values({
              id: crypto.randomUUID(),
              reportId: newRepId,
              version: rev.version,
              authorId: rev.authorId || '',
              authorName: rev.authorName || '',
              authorRole: rev.authorRole || '',
              status: rev.status,
              findings: rev.findings || "", impression: rev.impression || "", technique: rev.technique || "", recommendation: rev.recommendation || "",
              notes: rev.notes || '',
              createdAt: parseDateSafely(rev.createdAt),
            } as any)
            .onConflictDoNothing();
        }
      }
    } else {
      const incomingRepTime = parseDateSafely(bundle.report.updatedAt || 0).getTime();
      const existingRepTime = parseDateSafely(existingRep.updatedAt || existingRep.createdAt || 0).getTime();

      // If claimed by another radiologist, preserve incoming report in revisions instead of overwriting active report
      const isClaimLockedByOther =
        requestingUser &&
        st.assignedRadiologistId &&
        st.assignedRadiologistId !== requestingUser.id &&
        requestingUser.role !== 'admin';

      if (isClaimLockedByOther) {
        const [latestRev] = await db
          .select({ version: reportRevisions.version })
          .from(reportRevisions)
          .where(eq(reportRevisions.reportId, existingRep.id))
          .orderBy(desc(reportRevisions.version))
          .limit(1);

        const nextVer = (latestRev?.version ?? 0) + 1;
        await db.insert(reportRevisions).values({
          id: crypto.randomUUID(), reportId: existingRep.id, version: nextVer,
          authorName: bundle.report.signedBy || requestingUser.name || 'External Clinician',
          status: 'sync_divergent_revision',
          findings: bundle.report.findings || "", impression: bundle.report.impression || "", technique: bundle.report.technique || "", recommendation: bundle.report.recommendation || "",
          notes: `[Preserved Divergent Draft from ${requestingUser.name || requestingUser.id} - Study Claimed by Another Doctor]`,
          createdAt: new Date(),
        } as any);

        conflictInfo = {
          reason: 'Study claimed by another radiologist; incoming report safely preserved in revision history.',
          archivedVersion: nextVer,
        };
      } else if (incomingRepTime >= existingRepTime) {
        // If content differs, archive existing report into reportRevisions first!
        const isContentDifferent =
          existingRep.findings !== bundle.report.findings ||
          existingRep.impression !== bundle.report.impression ||
          existingRep.status !== bundle.report.status;

        if (isContentDifferent && (existingRep.findings || existingRep.impression)) {
          const [latestRev] = await db
            .select({ version: reportRevisions.version })
            .from(reportRevisions)
            .where(eq(reportRevisions.reportId, existingRep.id))
            .orderBy(desc(reportRevisions.version))
            .limit(1);

          const nextVer = (latestRev?.version ?? 0) + 1;
          await db.insert(reportRevisions).values({
            id: crypto.randomUUID(), reportId: existingRep.id, version: nextVer,
            authorName: existingRep.signedBy || 'Previous Editor',
            status: existingRep.status,
            findings: existingRep.findings || '',
            impression: existingRep.impression || '',
            technique: existingRep.technique || '',
            recommendation: existingRep.recommendation || '',
            notes: '[Auto-Archived Before Sync Update]',
            createdAt: new Date(),
          } as any);
        }

        // Apply incoming report update
        await db
          .update(reports)
          .set({
            status: bundle.report.status,
            findings: bundle.report.findings ?? existingRep.findings,
            impression: bundle.report.impression ?? existingRep.impression,
            technique: bundle.report.technique ?? existingRep.technique,
            recommendation: bundle.report.recommendation ?? existingRep.recommendation,
            signedBy: bundle.report.signedBy ?? existingRep.signedBy,
            signedAt: parseDateOrNull(bundle.report.signedAt) ?? existingRep.signedAt,
            criticalFinding: Boolean(bundle.report.criticalFinding),
            updatedAt: parseDateSafely(bundle.report.updatedAt || Date.now()) as any,
          } as any)
          .where(eq(reports.id, existingRep.id));
      } else {
        // Incoming is older than existing, but preserve it as an immutable divergent revision!
        const [latestRev] = await db
          .select({ version: reportRevisions.version })
          .from(reportRevisions)
          .where(eq(reportRevisions.reportId, existingRep.id))
          .orderBy(desc(reportRevisions.version))
          .limit(1);

        const nextVer = (latestRev?.version ?? 0) + 1;
        await db.insert(reportRevisions).values({
          id: crypto.randomUUID(), reportId: existingRep.id, version: nextVer,
          authorName: bundle.report.signedBy || 'Sync Peer',
          status: 'sync_divergent_revision',
          findings: bundle.report.findings || "", impression: bundle.report.impression || "", technique: bundle.report.technique || "", recommendation: bundle.report.recommendation || "",
          notes: `[Preserved Incoming Sync Draft from ${bundle.report.updatedAt}]`,
          createdAt: new Date(),
        } as any);

        conflictInfo = {
          reason: 'Incoming report draft was older than active database report; safely preserved in revision history.',
          archivedVersion: nextVer,
        };
      }
    }
  }

  await logAudit({
    action: 'CASE_SYNC_INGEST',
    entityType: 'Study',
    entityId: normAcc,
    details: `Successfully ingested sync bundle for accession ${normAcc} (Patient: ${pat.fullName})${
      conflictInfo ? ` with revision conflict note: v${conflictInfo.archivedVersion}` : ''
    }`,
  });

  await recordSyncChange({
    tableName: 'studies',
    entityId: normAcc,
    operation: 'UPDATE',
    dataSummary: { patientName: pat.fullName, modality: bundle.study.modality, status: bundle.study.status },
  });

  return { success: true, accessionNumber: normAcc, conflict: conflictInfo };
}
