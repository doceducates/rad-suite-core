import { db } from '@/db';
import { studies, patients, reports, reportRevisions, hospitalPacsStudies } from '@/db/schema';
import { eq, and, ne, desc, or, like } from 'drizzle-orm';
import { getLocalCaseById } from '@/services/local-cases.service';
import { getReportByStudyOrAccession } from '@/services/report.service';
import { resolvePatientByMrn } from '@/services/mrn-resolution.service';
import { getStudyManifest } from '@/services/study-manifest.service';
import { isFilmChargesStudy } from '@/services/unified-case-filters';
import { parseStudyTimestamp } from '@/services/study-sorting';
import { isUuid } from '@/lib/mrn-security';
import {
  registerStudyFromExternalSource,
  discoverRemoteSeries,
} from './workspace-case-registration.service';

export interface ResolvedWorkspaceCase {
  study: any;
  patient: any;
  initialReport: any;
  isLocalCase: boolean;
  localCaseId?: string;
  localSeries: any[];
}

/**
 * Resolves or auto-registers a study and its patient/series across all sources
 * (Local, S3 Manifest, Hospital PACS DIMSE, Indexed PACS Archive, MRN Lookup)
 */
export async function resolveWorkspaceCase(
  accession: string,
  currentUser?: any
): Promise<ResolvedWorkspaceCase | null> {
  const cleanAcc = (accession || '').trim();
  if (!cleanAcc) return null;

  // 1. Check physical local DICOM folder in E:\Cases
  const localCase = getLocalCaseById(cleanAcc) || getLocalCaseById(cleanAcc.toUpperCase());
  if (localCase) {
    const accNumber = localCase.accessionNumber || localCase.patientId;
    const dbRecord = await getReportByStudyOrAccession(accNumber);

    return {
      study: {
        id: dbRecord?.study?.id || localCase.id,
        accessionNumber: accNumber,
        modality: localCase.modality,
        studyDescription: localCase.studyDescription || dbRecord?.study?.scanType || 'Clinical Examination',
        scanType: localCase.studyDescription || dbRecord?.study?.scanType || 'Clinical Examination',
        patientId: dbRecord?.patient?.id || localCase.id,
        clinicalHistory: dbRecord?.study?.clinicalHistory || '',
        assignedRadiologistId: dbRecord?.study?.assignedRadiologistId,
        assignedRadiologistName: dbRecord?.study?.assignedRadiologistName,
      },
      patient: {
        id: dbRecord?.patient?.id || localCase.id,
        fullName: localCase.patientName,
        mrNumber: localCase.patientId,
        age: localCase.age || 45,
        gender: localCase.gender || 'Male',
      },
      initialReport: dbRecord?.report ? {
        id: dbRecord.report.id,
        currentVersion: dbRecord.report.currentVersion || 1,
        clinicalHistory: dbRecord.report.clinicalHistory || '',
        technique: dbRecord.report.technique || '',
        findings: dbRecord.report.findings || '',
        impression: dbRecord.report.impression || '',
        status: dbRecord.report.status || 'draft',
        criticalFinding: Boolean(dbRecord.report.criticalFinding),
        contentJson: dbRecord.report.contentJson || null,
      } : null,
      isLocalCase: true,
      localCaseId: localCase.id,
      localSeries: localCase.series || [],
    };
  }

  // 2. Query database for standard accession or study UUID (casing & short-accession support)
  let [row] = await db
    .select({
      study: studies,
      patient: patients,
      report: reports,
    })
    .from(studies)
    .leftJoin(patients, eq(patients.id, studies.patientId))
    .leftJoin(reports, eq(reports.studyId, studies.id))
    .where(
      or(
        eq(studies.id, cleanAcc),
        eq(studies.accessionNumber, cleanAcc),
        eq(studies.accessionNumber, cleanAcc.toUpperCase()),
        eq(studies.accessionNumber, cleanAcc.toLowerCase())
      )
    )
    .limit(1);

  // 2.5 Fallback: Suffix match if cleanAcc is a short accession (e.g. 5 digits)
  if (!row && cleanAcc.length >= 4) {
    [row] = await db
      .select({
        study: studies,
        patient: patients,
        report: reports,
      })
      .from(studies)
      .leftJoin(patients, eq(patients.id, studies.patientId))
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(like(studies.accessionNumber, `%${cleanAcc}`))
      .limit(1);
  }

  // 2.7 Fallback: MRN resolution if cleanAcc matches an existing patient's MR Number
  if (!row) {
    const [patientMatch] = await db
      .select()
      .from(patients)
      .where(or(eq(patients.mrNumber, cleanAcc), like(patients.mrNumber, `%${cleanAcc}`)))
      .limit(1);

    if (patientMatch) {
      const patientStudies = await db
        .select({
          study: studies,
          patient: patients,
          report: reports,
        })
        .from(studies)
        .leftJoin(patients, eq(patients.id, studies.patientId))
        .leftJoin(reports, eq(reports.studyId, studies.id))
        .where(eq(studies.patientId, patientMatch.id))
        .orderBy(desc(studies.scheduledAt), desc(studies.createdAt));

      if (patientStudies.length > 0) {
        row = patientStudies.find(
          (s) => s.study.status === 'in-progress' || s.study.status === 'scheduled' || !s.report?.id
        ) || patientStudies[0];
      }
    }
  }

  // Self-heal patient if study exists but patient record was unlinked
  if (row?.study && !row.patient) {
    const healed = await resolvePatientByMrn({
      mrn: (!isUuid(row.study.patientId) ? row.study.patientId : null) || cleanAcc,
      fullName: `Patient ${cleanAcc}`,
    });
    await db.update(studies).set({ patientId: healed.id }).where(eq(studies.id, row.study.id));
    const [pRec] = await db.select().from(patients).where(eq(patients.id, healed.id)).limit(1);
    row.patient = pRec;
  }

  // 3. Fallback: Query Indexed Hospital PACS table (Instant SQLite query, <1ms)
  if (!row) {
    const [pacsRow] = await db
      .select()
      .from(hospitalPacsStudies)
      .where(
        or(
          eq(hospitalPacsStudies.accessionNumber, cleanAcc),
          like(hospitalPacsStudies.accessionNumber, `%${cleanAcc}`)
        )
      )
      .limit(1);

    if (pacsRow) {
      row = await registerStudyFromExternalSource({
        accession: pacsRow.accessionNumber,
        mrn: pacsRow.patientMrn || pacsRow.patientId || cleanAcc,
        fullName: pacsRow.patientName || 'PATIENT',
        modality: pacsRow.modality || 'MR',
        studyDescription: pacsRow.studyDescription,
        currentUser,
      });
    }
  }

  // 4. Fast path: Check local manifest cache (<1ms, zero remote network calls)
  if (!row) {
    const manifest = await getStudyManifest(cleanAcc, { localOnly: true });
    if (manifest) {
      row = await registerStudyFromExternalSource({
        accession: cleanAcc,
        mrn: manifest.patientId || cleanAcc,
        fullName: manifest.patientName || 'PATIENT',
        modality: manifest.modality || 'MR',
        studyDescription: manifest.studyDescription,
        currentUser,
      });
    }
  }

  // 5. Fallback: Auto-register study from accession so clinician can report immediately
  if (!row) {
    row = await registerStudyFromExternalSource({
      accession: cleanAcc,
      mrn: cleanAcc,
      fullName: `Patient ${cleanAcc}`,
      modality: 'CT',
      studyDescription: 'Clinical Examination',
      currentUser,
    });
  }

  if (!row) return null;

  const { study, patient, report } = row;

  // Discover companion, prior & newer studies for this patient (excluding billing film charges)
  let companionStudies: any[] = [];
  let priorStudies: any[] = [];
  let newerStudies: any[] = [];
  if (patient?.id) {
    const rawStudies = await db
      .select({
        accessionNumber: studies.accessionNumber,
        studyDescription: studies.scanType,
        status: studies.status,
        modality: studies.modality,
        scheduledAt: studies.scheduledAt,
        createdAt: studies.createdAt,
      })
      .from(studies)
      .where(and(eq(studies.patientId, patient.id), ne(studies.id, study.id)));

    const otherStudies = rawStudies.filter((cs) => !isFilmChargesStudy(cs.studyDescription));
    const currentStudyTime = parseStudyTimestamp(study.scheduledAt || study.createdAt);

    for (const os of otherStudies) {
      const osTime = parseStudyTimestamp(os.scheduledAt || os.createdAt);
      const sameDay = Boolean(
        study.scheduledAt && os.scheduledAt &&
        String(study.scheduledAt).slice(0, 10) === String(os.scheduledAt).slice(0, 10)
      );
      const isSameEncounter = sameDay || (currentStudyTime > 0 && osTime > 0 && Math.abs(currentStudyTime - osTime) <= 36 * 3600 * 1000);

      const summary = {
        accessionNumber: os.accessionNumber,
        studyDescription: os.studyDescription,
        status: os.status,
        modality: os.modality,
        studyDate: os.scheduledAt || os.createdAt,
      };

      if (isSameEncounter) companionStudies.push(summary);
      else if (osTime < currentStudyTime || (!currentStudyTime && os.accessionNumber < study.accessionNumber)) {
        priorStudies.push(summary);
      } else {
        newerStudies.push(summary);
      }
    }
  }

  let reportCurrentVersion = 1;
  if (report?.id) {
    const [latestRev] = await db
      .select({ version: reportRevisions.version })
      .from(reportRevisions)
      .where(eq(reportRevisions.reportId, report.id))
      .orderBy(desc(reportRevisions.version))
      .limit(1);
    if (latestRev?.version) reportCurrentVersion = latestRev.version;
  }

  const initialReportWithHistory = {
    clinicalHistory: study.clinicalHistory || '',
    technique: '', findings: '', impression: '', status: 'draft',
    ...(report || {}),
    criticalFinding: Boolean(report?.criticalFinding),
    currentVersion: reportCurrentVersion,
  };

  // Discover remote series via Unified Manifest (Hot Staging + S3 + PACS + Edge)
  const { hasRemoteSeries, mappedRemoteSeries } = await discoverRemoteSeries(study.accessionNumber || cleanAcc, study.modality);

  return {
    study: {
      ...study,
      studyDescription: study.scanType || (study as any).studyDescription || 'Clinical Examination',
      companionStudies,
      priorStudies,
      newerStudies,
    },
    patient: patient || {
      id: study.patientId || study.id,
      fullName: `Patient ${cleanAcc}`,
      mrNumber: (!isUuid(study.patientId) ? study.patientId : null) || cleanAcc,
      age: 45,
      gender: 'Male',
    },
    initialReport: initialReportWithHistory,
    isLocalCase: hasRemoteSeries,
    localCaseId: hasRemoteSeries ? (study.accessionNumber || cleanAcc) : undefined,
    localSeries: mappedRemoteSeries,
  };
}
