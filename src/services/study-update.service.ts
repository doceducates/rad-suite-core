// Layer 2 (Domain/Services): Study & Patient Demographics Update Service
import crypto from 'crypto';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { logAudit } from './audit.service';
import { resolvePatientByMrn, normalizeMrn } from './mrn-resolution.service';
import { getLocalCases } from './local-cases.service';
import { inferBodyPart, UserContext, UpdatePatientStudyInput } from './patient-management.service';
import type { PacsStudyResult } from '@/types/pacs';

/**
 * Updates patient demographics and study parameters for an existing case.
 */
export async function updatePatientAndStudyDetails(
  targetAccession: string,
  input: UpdatePatientStudyInput,
  user: UserContext
): Promise<{ success: boolean; study: PacsStudyResult }> {
  const normTarget = targetAccession.trim().toUpperCase();

  // 1. Locate study in DB
  let [study] = await db
    .select()
    .from(studies)
    .where(or(eq(studies.accessionNumber, normTarget), eq(studies.id, targetAccession)))
    .limit(1);

  let patient: any = null;

  if (study) {
    [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, study.patientId))
      .limit(1);
  } else {
    // If not in DB, check local archive cases to import on-the-fly
    const localCases = getLocalCases();
    const local = localCases.find((c) => c.accessionNumber.toUpperCase() === normTarget);
    if (!local) {
      throw new Error(`Study with accession number "${targetAccession}" not found.`);
    }

    patient = await resolvePatientByMrn({
      mrn: local.patientId,
      fullName: local.patientName,
      age: local.age,
      gender: local.gender,
    });

    const newStudyId = crypto.randomUUID();
    await db.insert(studies).values({
      id: newStudyId,
      patientId: patient.id,
      accessionNumber: local.accessionNumber,
      modality: local.modality === 'MR' ? 'MRI' : local.modality,
      scanType: local.studyDescription,
      bodyPart: inferBodyPart(local.studyDescription, local.modality),
      priority: 'routine',
      status: 'scheduled',
      scheduledAt: (local.studyDate && !isNaN(new Date(local.studyDate).getTime())) ? new Date(local.studyDate) : new Date(),
      createdAt: new Date(),
    } as any);

    [study] = await db.select().from(studies).where(eq(studies.id, newStudyId)).limit(1);
  }

  // 2. Validate mandatory MRN / Accession invariant
  const newAcc = input.accessionNumber !== undefined ? input.accessionNumber.trim().toUpperCase() : study.accessionNumber;
  const newMrn = input.patientMrn !== undefined ? normalizeMrn(input.patientMrn.trim()) : (patient?.mrNumber || '');

  if (!newAcc && !newMrn) {
    throw new Error('At least one of MR Number or Accession Number is mandatory.');
  }

  // Check accession uniqueness if changed
  if (newAcc && newAcc !== study.accessionNumber) {
    const [conflict] = await db.select().from(studies).where(eq(studies.accessionNumber, newAcc)).limit(1);
    if (conflict) {
      if (input.mergeIfConflict) {
        const { mergeManualCaseToHmis } = await import('./case-merge.service');
        await mergeManualCaseToHmis(
          { sourceAccession: study.accessionNumber, targetAccession: newAcc, notes: 'Auto-merged via details update' },
          user
        );
        const [targetStudy] = await db.select().from(studies).where(eq(studies.id, conflict.id)).limit(1);
        const [targetPatient] = await db.select().from(patients).where(eq(patients.id, targetStudy.patientId)).limit(1);
        const mappedTarget: PacsStudyResult = {
          accessionNumber: targetStudy.accessionNumber,
          patientName: targetPatient.fullName,
          patientMrn: targetPatient.mrNumber,
          patientId: targetPatient.mrNumber,
          age: targetPatient.age,
          gender: targetPatient.gender as any,
          dateOfBirth: targetPatient.dob || undefined,
          modality: targetStudy.modality,
          studyDescription: targetStudy.scanType,
          studyDate: targetStudy.scheduledAt ? new Date(targetStudy.scheduledAt).toISOString() : new Date().toISOString(),
          studyTime: targetStudy.scheduledAt ? new Date(targetStudy.scheduledAt).toTimeString().slice(0, 8) : undefined,
          numSeries: 1,
          numInstances: 1,
          pacsServerAe: 'DATABASE',
          studyInstanceUid: targetStudy.id,
          source: 'worklist',
        };
        return { success: true, study: mappedTarget, merged: true } as any;
      }

      const [conflictPat] = await db.select().from(patients).where(eq(patients.id, conflict.patientId)).limit(1);
      const err: any = new Error(
        `Accession number "${newAcc}" is already in use by another study (${conflictPat?.fullName || 'Patient'} - ${conflict.scanType}).`
      );
      err.isConflict = true;
      err.conflictCode = 'ACCESSION_EXISTS';
      err.conflictStudy = {
        accessionNumber: conflict.accessionNumber,
        patientName: conflictPat?.fullName || 'Unknown Patient',
        patientMrn: conflictPat?.mrNumber || '',
        scanType: conflict.scanType,
        modality: conflict.modality,
        status: conflict.status,
      };
      throw err;
    }
  }

  // 3. Update Patient record & handle MRN collisions
  if (patient) {
    let targetPatientId = patient.id;

    if (newMrn && newMrn !== patient.mrNumber) {
      const [existingPatientWithMrn] = await db
        .select()
        .from(patients)
        .where(eq(patients.mrNumber, newMrn))
        .limit(1);

      if (existingPatientWithMrn && existingPatientWithMrn.id !== patient.id) {
        // Patient with this MRN already exists. Check if they have an active study matching this one.
        const existingPatientStudies = await db
          .select()
          .from(studies)
          .where(eq(studies.patientId, existingPatientWithMrn.id));

        const matchingStudy = existingPatientStudies.find(
          (s) => s.accessionNumber.toUpperCase() === newAcc || s.id === newAcc
        );

        if (matchingStudy && matchingStudy.id !== study.id) {
          if (input.mergeIfConflict) {
            const { mergeManualCaseToHmis } = await import('./case-merge.service');
            await mergeManualCaseToHmis(
              { sourceAccession: study.accessionNumber, targetAccession: matchingStudy.accessionNumber, notes: 'MRN collision auto-merge' },
              user
            );
            const [mergedStudy] = await db.select().from(studies).where(eq(studies.id, matchingStudy.id)).limit(1);
            return {
              success: true,
              study: {
                accessionNumber: mergedStudy.accessionNumber,
                patientName: existingPatientWithMrn.fullName,
                patientMrn: existingPatientWithMrn.mrNumber,
                patientId: existingPatientWithMrn.mrNumber,
                age: existingPatientWithMrn.age,
                gender: existingPatientWithMrn.gender as any,
                dateOfBirth: existingPatientWithMrn.dob || undefined,
                modality: mergedStudy.modality,
                studyDescription: mergedStudy.scanType,
                studyDate: mergedStudy.scheduledAt ? new Date(mergedStudy.scheduledAt).toISOString() : new Date().toISOString(),
                numSeries: 1,
                numInstances: 1,
                pacsServerAe: 'DATABASE',
                studyInstanceUid: mergedStudy.id,
                source: 'worklist',
              },
              merged: true,
            } as any;
          }

          const err: any = new Error(
            `Patient with MRN "${newMrn}" (${existingPatientWithMrn.fullName}) already exists with study "${matchingStudy.accessionNumber}".`
          );
          err.isConflict = true;
          err.conflictCode = 'MRN_STUDY_EXISTS';
          err.conflictStudy = {
            accessionNumber: matchingStudy.accessionNumber,
            patientName: existingPatientWithMrn.fullName,
            patientMrn: existingPatientWithMrn.mrNumber,
            scanType: matchingStudy.scanType,
            modality: matchingStudy.modality,
            status: matchingStudy.status,
          };
          throw err;
        }

        // Reassign current study and any companion studies of the patient to this existing patient record
        await db.update(studies).set({ patientId: existingPatientWithMrn.id }).where(eq(studies.patientId, patient.id));
        targetPatientId = existingPatientWithMrn.id;
        patient = existingPatientWithMrn;
      }
    }

    const patientUpdates: Record<string, any> = {};
    if (input.patientName?.trim()) patientUpdates.fullName = input.patientName.trim();
    if (newMrn && targetPatientId === patient.id) patientUpdates.mrNumber = newMrn;
    if (input.age !== undefined && input.age >= 0) patientUpdates.age = input.age;
    if (input.gender) patientUpdates.gender = input.gender;
    if (input.dob) patientUpdates.dob = input.dob;
    if (input.phone !== undefined) patientUpdates.phone = input.phone.trim();

    if (Object.keys(patientUpdates).length > 0) {
      await db.update(patients).set(patientUpdates as any).where(eq(patients.id, targetPatientId));
    }
  }

  // 4. Update Study record
  const studyUpdates: Record<string, any> = {};
  if (newAcc) studyUpdates.accessionNumber = newAcc;
  if (input.modality) studyUpdates.modality = input.modality.toUpperCase();
  if (input.studyDescription) studyUpdates.scanType = input.studyDescription.trim();
  if (input.bodyPart) studyUpdates.bodyPart = input.bodyPart.trim();
  if (input.priority) studyUpdates.priority = input.priority;
  if (input.department !== undefined) studyUpdates.department = input.department.trim();
  if (input.room !== undefined) studyUpdates.room = input.room.trim();
  if (input.referringDoctor !== undefined) studyUpdates.referringDoctor = input.referringDoctor.trim();
  if (input.technologist !== undefined) studyUpdates.technologist = input.technologist.trim();
  if (input.clinicalHistory !== undefined) studyUpdates.clinicalHistory = input.clinicalHistory.trim();
  if (input.scheduledAt) studyUpdates.scheduledAt = new Date(input.scheduledAt);
  if (input.contrastUsed !== undefined) studyUpdates.contrastUsed = Boolean(input.contrastUsed);
  if (input.contrastAgent !== undefined) studyUpdates.contrastAgent = input.contrastAgent;
  if (input.contrastVolumeMl !== undefined) studyUpdates.contrastVolumeMl = input.contrastVolumeMl;

  if (Object.keys(studyUpdates).length > 0) {
    await db.update(studies).set(studyUpdates as any).where(eq(studies.id, study.id));
  }

  // If accession was renamed, sync corresponding hmis_draft_vault entries
  if (newAcc && newAcc !== study.accessionNumber) {
    try {
      const { hmisDraftVault } = await import('@/db/schema');
      await db
        .update(hmisDraftVault)
        .set({ accession: newAcc, patientMrn: newMrn || patient?.mrNumber || '' })
        .where(eq(hmisDraftVault.accession, study.accessionNumber));
    } catch {}
  }

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'UPDATE_PATIENT_DETAILS',
    entityType: 'Study',
    entityId: newAcc || study.accessionNumber,
    details: `Updated details for study ${study.accessionNumber} -> ${newAcc}. Modified: ${Object.keys(studyUpdates).join(', ')}`,
  });

  // Re-fetch updated records
  const [freshStudy] = await db.select().from(studies).where(eq(studies.id, study.id)).limit(1);
  const [freshPatient] = await db.select().from(patients).where(eq(patients.id, freshStudy.patientId)).limit(1);

  const updatedResult: PacsStudyResult = {
    accessionNumber: freshStudy.accessionNumber,
    patientName: freshPatient.fullName,
    patientMrn: freshPatient.mrNumber,
    patientId: freshPatient.mrNumber,
    age: freshPatient.age,
    gender: freshPatient.gender as any,
    dateOfBirth: freshPatient.dob || undefined,
    modality: freshStudy.modality,
    studyDescription: freshStudy.scanType,
    studyDate: freshStudy.scheduledAt ? new Date(freshStudy.scheduledAt).toISOString() : new Date().toISOString(),
    studyTime: freshStudy.scheduledAt ? new Date(freshStudy.scheduledAt).toTimeString().slice(0, 8) : undefined,
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'DATABASE',
    studyInstanceUid: freshStudy.id,
    source: 'worklist',
    status: (freshStudy.status || 'scheduled') as any,
    priority: (freshStudy.priority || 'routine') as any,
    studyId: freshStudy.id,
    referringDoctor: freshStudy.referringDoctor || undefined,
    technologist: (freshStudy as any)?.technologist || undefined,
    department: freshStudy.department || '',
    room: freshStudy.room || '',
    patientPhone: freshPatient?.phone || undefined,
    phone: freshPatient?.phone || undefined,
  };

  return { success: true, study: updatedResult };
}
