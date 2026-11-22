// Layer 2 (Domain/Services): Patient & Study Manual Ingestion Management
import crypto from 'crypto';
import { db } from '@/db';
import { studies, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logAudit } from './audit.service';
import { resolvePatientByMrn, normalizeMrn } from './mrn-resolution.service';
import { checkDuplicateManualCase } from './manual-case-dedup.service';
import type { PacsStudyResult } from '@/types/pacs';

export { updatePatientAndStudyDetails } from './study-update.service';

export interface UserContext {
  id: string;
  name: string;
  role: string;
}

export interface ManualPatientStudyInput {
  patientName: string;
  patientMrn?: string;
  accessionNumber?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  modality?: string;
  studyDescription?: string;
  bodyPart?: string;
  department?: string;
  room?: string;
  priority?: 'routine' | 'urgent' | 'stat';
  referringDoctor?: string;
  technologist?: string;
  scheduledAt?: string | Date;
  clinicalHistory?: string;
  phone?: string;
  contrastUsed?: boolean;
  contrastAgent?: string;
  contrastVolumeMl?: number;
  allowDuplicate?: boolean;
}

export interface UpdatePatientStudyInput {
  patientName?: string;
  patientMrn?: string;
  accessionNumber?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  phone?: string;
  modality?: string;
  studyDescription?: string;
  bodyPart?: string;
  department?: string;
  room?: string;
  priority?: 'routine' | 'urgent' | 'stat';
  referringDoctor?: string;
  technologist?: string;
  scheduledAt?: string | Date;
  clinicalHistory?: string;
  contrastUsed?: boolean;
  contrastAgent?: string;
  contrastVolumeMl?: number;
  mergeIfConflict?: boolean;
}

export function inferBodyPart(description?: string, modality?: string): string {
  if (!description) return 'General';
  const desc = description.toLowerCase();
  if (/brain|head|neuro|cns|infarct|stroke|cranium/i.test(desc)) return 'Brain';
  if (/lumbar|ls spine|l-spine|lumbosacral/i.test(desc)) return 'LS Spine';
  if (/cervical|c-spine/i.test(desc)) return 'Cervical Spine';
  if (/thoracic|dorsal|d-spine|t-spine/i.test(desc)) return 'Thoracic Spine';
  if (/whole spine|screening spine|full spine/i.test(desc)) return 'Whole Spine';
  if (/spine|vertebra/i.test(desc)) return 'Spine';
  if (/chest|lung|thorax|hrct|pulmonary/i.test(desc)) return 'Chest';
  if (/abdo|pelvis|liver|kub|renal|kidney/i.test(desc)) return 'Abdomen';
  if (/knee|shoulder|ankle|hip|wrist|elbow|bone|joint|extremity/i.test(desc)) return 'MSK';
  return modality === 'MR' ? 'Spine / Brain' : 'Body';
}

/**
 * Creates a standalone manual patient, study, and draft report.
 * Mandatory Invariant: At least one of MR Number or Accession Number is required.
 */
export async function createManualPatientAndStudy(
  input: ManualPatientStudyInput,
  user: UserContext
): Promise<{ success: boolean; accessionNumber: string; studyId: string; reportId: string; study: PacsStudyResult }> {
  const mrnTrimmed = (input.patientMrn || '').trim();
  const accTrimmed = (input.accessionNumber || '').trim();

  if (!mrnTrimmed && !accTrimmed) {
    throw new Error('At least one of MR Number or Accession Number is mandatory.');
  }

  // 1. Resolve Accession Number
  let accessionNumber = accTrimmed.toUpperCase();
  if (!accessionNumber) {
    const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    accessionNumber = `MAN-${yymmdd}-${randHex}`;
  }

  // Check unique accession
  const [existingStudy] = await db
    .select()
    .from(studies)
    .where(eq(studies.accessionNumber, accessionNumber))
    .limit(1);

  if (existingStudy) {
    throw new Error(`Study with accession number "${accessionNumber}" already exists.`);
  }

  const modality = (input.modality || 'CT').toUpperCase();
  const scanType = input.studyDescription?.trim() || 'Radiological Examination';
  const scheduledDate = (input.scheduledAt && !isNaN(new Date(input.scheduledAt).getTime())) ? new Date(input.scheduledAt) : new Date();

  // 2. Prevent accidental duplicate manual submissions for this patient
  if (mrnTrimmed && !input.allowDuplicate) {
    const dupCheck = await checkDuplicateManualCase(mrnTrimmed, modality, scanType, scheduledDate);
    if (dupCheck.exists && dupCheck.existingStudy) {
      const err: any = new Error(
        `Duplicate study detected: Patient ${dupCheck.patientName || mrnTrimmed} already has a study for "${scanType}" today (Accession: ${dupCheck.existingStudy.accessionNumber}).`
      );
      err.isDuplicate = true;
      err.existingStudy = dupCheck.existingStudy;
      throw err;
    }
  }

  // 3. Resolve or Create Patient
  const patientMrn = mrnTrimmed ? normalizeMrn(mrnTrimmed) : `MRN-${accessionNumber}`;
  const patientAge = input.age !== undefined && input.age >= 0 ? input.age : 40;
  const patientGender = input.gender || 'Male';
  const patientDob = input.dob || `${new Date().getFullYear() - patientAge}-01-01`;

  const patient = await resolvePatientByMrn({
    mrn: patientMrn,
    fullName: input.patientName.trim(),
    age: patientAge,
    gender: patientGender,
    phone: input.phone?.trim() || null,
  });

  // 4. Create Study Record
  const studyId = crypto.randomUUID();
  const reportId = crypto.randomUUID();
  const bodyPart = input.bodyPart?.trim() || inferBodyPart(scanType, modality);
  const priority = input.priority || 'routine';

  await db.insert(studies).values({
    id: studyId,
    patientId: patient.id,
    accessionNumber,
    modality,
    scanType,
    bodyPart,
    priority,
    status: 'scheduled',
    clinicalHistory: input.clinicalHistory?.trim() || '',
    referringDoctor: input.referringDoctor?.trim() || '',
    technologist: input.technologist?.trim() || '',
    department: input.department?.trim() || '',
    room: input.room?.trim() || '',
    contrastUsed: Boolean(input.contrastUsed),
    contrastAgent: input.contrastAgent || '',
    contrastVolumeMl: input.contrastVolumeMl || 0,
    scheduledAt: scheduledDate,
    assignedRadiologistId: user.id || null,
    assignedRadiologistName: user.name || null,
    claimedAt: user.id ? scheduledDate : null,
    isManual: true,
    createdAt: new Date(),
  } as any);

  // 5. Create Draft Report Record
  await db.insert(reports).values({
    id: reportId,
    studyId,
    patientId: patient.id,
    authorId: user.id || '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
    status: 'draft',
    technique: `${modality} examination performed as requested.`,
    findings: '',
    impression: '',
    criticalFinding: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'CREATE_MANUAL_CASE',
    entityType: 'Study',
    entityId: accessionNumber,
    details: `Created manual study ${accessionNumber} (${modality}) for ${input.patientName} (MRN: ${patient.mrNumber})`,
  });

  const pacsResult: PacsStudyResult = {
    accessionNumber,
    patientName: input.patientName.trim(),
    patientMrn: patient.mrNumber,
    patientId: patient.mrNumber,
    age: patientAge,
    gender: patientGender,
    dateOfBirth: patientDob,
    modality,
    studyDescription: scanType,
    studyDate: scheduledDate.toISOString(),
    studyTime: scheduledDate.toTimeString().slice(0, 8),
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'MANUAL_ENTRY',
    studyInstanceUid: studyId,
    source: 'worklist',
    status: 'draft',
    priority,
    studyId,
    reportId,
    isManual: true,
    referringDoctor: input.referringDoctor?.trim(),
    technologist: input.technologist?.trim(),
    department: input.department?.trim(),
    room: input.room?.trim(),
    patientPhone: input.phone?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    assignedRadiologistId: user.id || null,
    assignedRadiologistName: user.name || null,
    claimedAt: user.id ? scheduledDate.toISOString() : null,
  };

  // Enqueue manual case for offline sync
  (async () => {
    try {
      const { enqueueCaseSync } = await import('./sync/case-sync-outbox.service');
      await enqueueCaseSync(accessionNumber, 'upsert');
    } catch (err) {
      console.warn('[CASE_SYNC_MANUAL_ENQUEUE_WARN]', err);
    }
  })();

  return { success: true, accessionNumber, studyId, reportId, study: pacsResult };
}
