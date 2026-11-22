import crypto from 'crypto';
import { db } from '@/db';
import { studies, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseDateSafely } from '@/lib/date-utils';
import { logAudit } from './audit.service';
import { resolvePatientByMrn } from './mrn-resolution.service';
import {
  deduplicatePacsStudies,
  acquireImportLock,
  releaseImportLock,
} from './pacs-deduplication.service';
import { testPacsTcpConnection } from './pacs-network.service';
import {
  DEFAULT_LGH_PACS,
  getPacsServers,
  savePacsServer,
  deletePacsServer,
  setDefaultPacsServer,
} from './pacs-server.service';
import { queryUnifiedCases, getUnifiedCase } from './unified-case.service';
import { queryPacsDimse } from './pacs-dimse.service';
import { retrieveStudyFromPacs } from './pacs-retrieval.service';
import { queryS3Studies } from './s3-case.service';
import { queryGoogleDriveStudies } from './gdrive-case.service';
import { getClinicNodeStatus } from './clinic-node.service';
import { aggregateMultiSourceStudies } from './unified-source-aggregator.service';
import type { PacsServer, PacsQueryFilter, PacsStudyResult } from '@/types/pacs';

export { testPacsTcpConnection, DEFAULT_LGH_PACS, getPacsServers, savePacsServer, deletePacsServer, setDefaultPacsServer };

export async function getPacsStudyByAccession(accession: string): Promise<PacsStudyResult | undefined> {
  const found = getUnifiedCase(accession);
  if (found) {
    if ('series' in found) {
      return {
        accessionNumber: found.accessionNumber,
        patientName: found.patientName,
        patientMrn: found.patientId,
        patientId: found.patientId,
        age: found.age,
        gender: found.gender,
        dateOfBirth: found.dateOfBirth,
        examId: found.examId,
        modality: found.modality,
        studyDescription: found.studyDescription,
        studyDate: found.studyDate,
        studyTime: found.studyTime,
        numSeries: found.series.length,
        numInstances: found.numInstances,
        pacsServerAe: 'LOCAL_ARCHIVE',
        studyInstanceUid: found.studyInstanceUid,
        referringDoctor: found.referringPhysician,
        source: 'local_archive',
        localCaseId: found.id,
        folderPath: found.folderPath,
      };
    }
    return found;
  }

  // Check S3 Cloud Storage
  try {
    const s3Results = await queryS3Studies({ accessionNumber: accession });
    const s3Match = s3Results.find(
      (s) => s.accessionNumber.trim().toUpperCase() === accession.trim().toUpperCase()
    );
    if (s3Match) return s3Match;
  } catch {}

  // Check Google Drive
  try {
    const gdriveResults = await queryGoogleDriveStudies({ accessionNumber: accession });
    const gdMatch = gdriveResults.find(
      (s) => s.accessionNumber.trim().toUpperCase() === accession.trim().toUpperCase()
    );
    if (gdMatch) return gdMatch;
  } catch {}

  // Check Remote Clinic Node
  try {
    const nodeStatus = getClinicNodeStatus();
    const nodeMatch = (nodeStatus.syncedStudies || []).find(
      (s) => s.accession.trim().toUpperCase() === accession.trim().toUpperCase()
    );
    if (nodeMatch) {
      return {
        accessionNumber: nodeMatch.accession,
        patientName: nodeMatch.patientName || 'PATIENT',
        patientMrn: nodeMatch.patientId || nodeMatch.accession,
        patientId: nodeMatch.patientId,
        age: 0,
        gender: 'Other',
        modality: nodeMatch.modality || 'MR',
        studyDescription: `Clinic PC Synced (${nodeMatch.status})`,
        studyDate: nodeMatch.studyDate || new Date().toISOString().split('T')[0],
        studyTime: nodeMatch.time || '',
        numSeries: 1,
        numInstances: (nodeMatch as any).sliceCount || 1,
        pacsServerAe: 'CLINIC_EDGE',
        studyInstanceUid: (nodeMatch as any).studyUid || `1.2.840.${nodeMatch.accession}`,
        source: 'remote_node',
        availableSources: ['remote_node'],
      };
    }
  } catch {}

  // Check Hospital PACS Index table (e.g. studies harvested and present in database on VPS)
  try {
    const { hospitalPacsStudies } = await import('@/db/schema');
    const [pacsMatch] = await db
      .select()
      .from(hospitalPacsStudies)
      .where(eq(hospitalPacsStudies.accessionNumber, accession.trim().toUpperCase()))
      .limit(1);

    if (pacsMatch) {
      return {
        accessionNumber: pacsMatch.accessionNumber,
        patientName: pacsMatch.patientName || 'PATIENT',
        patientMrn: pacsMatch.patientMrn || pacsMatch.patientId || pacsMatch.accessionNumber,
        patientId: pacsMatch.patientId || pacsMatch.accessionNumber,
        age: 45,
        gender: 'Other',
        modality: pacsMatch.modality || 'MR',
        studyDescription: pacsMatch.studyDescription || `${pacsMatch.modality} Examination`,
        studyDate: pacsMatch.studyDate || new Date().toISOString().split('T')[0],
        studyTime: pacsMatch.studyTime || '',
        numSeries: pacsMatch.numSeries || 1,
        numInstances: pacsMatch.numInstances || 1,
        pacsServerAe: pacsMatch.pacsSource || 'HMIS_PACS',
        studyInstanceUid: pacsMatch.studyInstanceUid || `1.2.840.${pacsMatch.accessionNumber}`,
        source: 'hospital_pacs',
        availableSources: ['hospital_pacs'],
        isDownloaded: false,
      };
    }
  } catch {}

  // If not found in cloud/node files, query live PACS server via DIMSE C-FIND (skip during unit tests)
  if (process.env.NODE_ENV !== 'test') {
    try {
      const pacsResults = await queryPacsDimse({ accessionNumber: accession });
      if (pacsResults.length > 0) {
        const match =
          pacsResults.find(
            (p) => p.accessionNumber.trim().toUpperCase() === accession.trim().toUpperCase()
          ) || pacsResults[0];

        // Auto-retrieve DICOM files into E:\Cases in background / on-demand
        if (match.studyInstanceUid) {
          retrieveStudyFromPacs(match.accessionNumber, match.studyInstanceUid, match.patientName).catch((err) => {
            console.warn('[PACS_AUTO_RETRIEVE_WARN]', err);
          });
        }

        return match;
      }
    } catch (err) {
      console.warn('[PACS_GET_STUDY_FAIL]', err);
    }
  }

  return undefined;
}

export async function queryPacsArchive(filter: PacsQueryFilter): Promise<PacsStudyResult[]> {
  return aggregateMultiSourceStudies(filter);
}

export async function importStudyToWorklist(
  data: PacsStudyResult,
  userId?: string,
  userName?: string
): Promise<{ success: boolean; studyId: string; accessionNumber: string }> {
  acquireImportLock(data.accessionNumber);

  try {
    // 1. Deterministic Patient Resolution (P1 #12) & Atomic Transaction
    const result = await db.transaction(async (tx) => {
      const patient = await resolvePatientByMrn(
        {
          mrn: data.patientMrn,
          fullName: data.patientName,
          age: data.age,
          gender: data.gender,
        },
        tx
      );

      // 2. Accession Collision & Idempotent Check (P1 #13)
      let targetAccession = data.accessionNumber.trim().toUpperCase();
      const [existingStudy] = await tx
        .select()
        .from(studies)
        .where(eq(studies.accessionNumber, targetAccession))
        .limit(1);

      let studyId: string = crypto.randomUUID();

      if (existingStudy) {
        if (existingStudy.patientId === patient.id) {
          studyId = existingStudy.id;
        } else {
          targetAccession = `${targetAccession}-DUP${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
          await tx.insert(studies).values({
            id: studyId,
            patientId: patient.id,
            accessionNumber: targetAccession,
            modality: data.modality,
            scanType: data.studyDescription,
            bodyPart: data.modality === 'CT' ? 'Brain / Body' : data.modality === 'CR' ? 'Chest' : 'Spine',
            priority: 'routine',
            status: 'scheduled',
            clinicalHistory: `${data.studyDescription} - Acquired at LGH Radiology Archive.`,
            scheduledAt: parseDateSafely(data.studyDate),
            createdAt: new Date(),
          } as any);
        }
      } else {
        await tx.insert(studies).values({
          id: studyId,
          patientId: patient.id,
          accessionNumber: targetAccession,
          modality: data.modality,
          scanType: data.studyDescription,
          bodyPart: data.modality === 'CT' ? 'Brain / Body' : data.modality === 'CR' ? 'Chest' : 'Spine',
          priority: 'routine',
          status: 'scheduled',
          clinicalHistory: `${data.studyDescription} - Acquired at LGH Radiology Archive.`,
          scheduledAt: parseDateSafely(data.studyDate),
          createdAt: new Date(),
        } as any);
      }

      // 3. Atomically ensure initial draft report exists
      const [existingReport] = await tx
        .select()
        .from(reports)
        .where(eq(reports.studyId, studyId))
        .limit(1);

      if (!existingReport) {
        await tx.insert(reports).values({
          id: crypto.randomUUID(),
          studyId,
          patientId: patient.id,
          authorId: userId || '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
          status: 'draft',
          technique: `Standard high-resolution diagnostic ${data.modality} acquisition protocol.`,
          findings: '',
          impression: '',
          criticalFinding: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      }

      return { studyId, accessionNumber: targetAccession };
    });

    // 4. Trigger DICOM C-GET retrieval to E:\Cases if study has not been downloaded
    if ((data.source === 'pacs' || !data.folderPath) && data.studyInstanceUid && process.env.NODE_ENV !== 'test') {
      retrieveStudyFromPacs(result.accessionNumber, data.studyInstanceUid, data.patientName).catch((err) => {
        console.warn('[PACS_RETRIEVAL_BG_WARN]', err);
      });
    }

    await logAudit({
      userId,
      userName: userName || 'Radiologist',
      action: 'PACS_STUDY_IMPORTED',
      entityType: 'Study',
      entityId: result.accessionNumber,
      details: `Imported study ${result.accessionNumber} (${data.modality}) for ${data.patientName} from PACS ${data.pacsServerAe}`,
    });

    return { success: true, studyId: result.studyId, accessionNumber: result.accessionNumber };
  } finally {
    releaseImportLock(data.accessionNumber);
  }
}
