// Layer 2 (Domain/Services): Manual Case Duplication Guard Service
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeMrn } from './mrn-resolution.service';

export interface DuplicateCheckResult {
  exists: boolean;
  message?: string;
  existingStudy?: {
    accessionNumber: string;
    studyDescription: string;
    modality: string;
    status: string;
    scheduledAt: string;
  };
  patientName?: string;
}

/**
 * Checks whether an existing manual or PACS study already exists for the given patient MRN
 * with an identical/matching modality and study description on the same calendar day.
 */
export async function checkDuplicateManualCase(
  patientMrn: string,
  modality: string,
  scanType: string,
  scheduledDate: Date = new Date()
): Promise<DuplicateCheckResult> {
  const normMrn = normalizeMrn(patientMrn.trim());
  if (!normMrn) {
    return { exists: false };
  }

  // 1. Locate patient by normalized MRN
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.mrNumber, normMrn))
    .limit(1);

  if (!patient) {
    return { exists: false };
  }

  // 2. Query studies for this patient
  const patientStudies = await db
    .select()
    .from(studies)
    .where(eq(studies.patientId, patient.id));

  if (!patientStudies || patientStudies.length === 0) {
    return { exists: false };
  }

  const normModality = modality.trim().toUpperCase();
  const normDesc = scanType.trim().toLowerCase();
  const targetDateStr = scheduledDate.toISOString().slice(0, 10); // YYYY-MM-DD

  for (const s of patientStudies) {
    const sModality = (s.modality || '').trim().toUpperCase();
    const sDesc = (s.scanType || '').trim().toLowerCase();
    const sDate = s.scheduledAt ? new Date(s.scheduledAt).toISOString().slice(0, 10) : '';

    // Check same modality
    const modalityMatches = sModality === normModality ||
      (normModality.includes('MR') && sModality.includes('MR')) ||
      (normModality.includes('CT') && sModality.includes('CT'));

    // Check same date (same calendar day)
    const dateMatches = sDate === targetDateStr;

    // Check matching or closely overlapping study description
    const descMatches = sDesc === normDesc ||
      (sDesc.length > 4 && normDesc.length > 4 && (sDesc.includes(normDesc) || normDesc.includes(sDesc)));

    if (modalityMatches && (dateMatches || descMatches)) {
      return {
        exists: true,
        message: `Patient ${patient.fullName} already has a matching study (${s.scanType}) registered today under Accession ${s.accessionNumber}.`,
        existingStudy: {
          accessionNumber: s.accessionNumber,
          studyDescription: s.scanType,
          modality: s.modality,
          status: s.status,
          scheduledAt: s.scheduledAt ? new Date(s.scheduledAt).toISOString() : new Date().toISOString(),
        },
        patientName: patient.fullName,
      };
    }
  }

  return { exists: false };
}
