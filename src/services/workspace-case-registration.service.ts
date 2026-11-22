// Layer 2 (Domain/Services): Workspace Study External Registration & Remote Series Discovery
// Strict File Size Invariant: Target < 150 lines
import crypto from 'crypto';
import { db } from '@/db';
import { studies, patients, reports } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { resolvePatientByMrn } from '@/services/mrn-resolution.service';
import { detectOrientationFromDescription } from '@/services/dicom-geometry.service';
import { getStudyManifest } from '@/services/study-manifest.service';

export async function registerStudyFromExternalSource(opts: {
  accession: string;
  mrn: string;
  fullName: string;
  modality: string;
  studyDescription?: string | null;
  currentUser?: any;
}) {
  const targetAcc = opts.accession.trim().toUpperCase();

  // Guard against duplicate study insert
  const [existing] = await db
    .select({ study: studies, patient: patients, report: reports })
    .from(studies)
    .leftJoin(patients, eq(patients.id, studies.patientId))
    .leftJoin(reports, eq(reports.studyId, studies.id))
    .where(
      or(
        eq(studies.accessionNumber, targetAcc),
        eq(studies.accessionNumber, opts.accession.trim())
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const patientRec = await resolvePatientByMrn({
    mrn: opts.mrn,
    fullName: opts.fullName,
    age: 45,
    gender: 'Male',
  });

  const newStudyId = crypto.randomUUID();
  const desc = opts.studyDescription || `${opts.modality} Examination`;

  await db.insert(studies).values({
    id: newStudyId,
    patientId: patientRec.id,
    accessionNumber: targetAcc,
    modality: opts.modality || 'MR',
    scanType: desc,
    bodyPart: desc,
    status: 'scheduled',
    priority: 'routine',
    scheduledAt: new Date().toISOString(),
    assignedRadiologistId: null,
    assignedRadiologistName: null,
    claimedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: 'tnt_lgh',
  } as any);

  const [reloaded] = await db
    .select({ study: studies, patient: patients, report: reports })
    .from(studies)
    .leftJoin(patients, eq(patients.id, studies.patientId))
    .leftJoin(reports, eq(reports.studyId, studies.id))
    .where(eq(studies.accessionNumber, targetAcc))
    .limit(1);

  return reloaded;
}

export async function discoverRemoteSeries(accession: string, modality?: string) {
  // Fast local/staged series check (<1ms) - remote cloud/PACS checked asynchronously on client
  const manifest = await getStudyManifest(accession, { modality, localOnly: true });
  if (manifest && manifest.series.length > 0) {
    return {
      hasRemoteSeries: true,
      mappedRemoteSeries: manifest.series.map((s) => ({
        seriesNumber: s.seriesNumber,
        seriesDescription: s.seriesDescription,
        orientation: s.orientation || detectOrientationFromDescription(s.seriesDescription),
        sliceCount: s.sliceCount,
        modality: modality || s.modality || 'MR',
      })),
    };
  }

  return { hasRemoteSeries: false, mappedRemoteSeries: [] };
}
