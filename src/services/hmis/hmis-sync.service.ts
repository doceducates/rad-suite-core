import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { hmisInvestigations, hmisPriorReports, studies } from '@/db/schema';
import { resolvePatientByMrn } from '@/services/mrn-resolution.service';
import { logAudit } from '@/services/audit.service';
import { HmisInvestigationDetails, HmisPriorReport } from './hmis-models';

/**
 * Synchronizes HMIS live investigation data into Rad Suite local database.
 */
export async function syncHmisInvestigation(
  details: HmisInvestigationDetails,
  userId?: string,
  userName?: string
): Promise<{ success: boolean; investigationId: string; patientId: string }> {
  const result = await db.transaction(async (tx) => {
    // 1. Resolve or create patient
    const patient = await resolvePatientByMrn(
      {
        mrn: details.mrn,
        fullName: details.patientName,
        age: details.age ? parseInt(details.age, 10) : 30,
        gender: details.gender,
        phone: details.contact,
      },
      tx
    );

    // 2. Link or create study if accession/studyId is present
    if (details.studyId) {
      const [existingStudy] = await tx
        .select()
        .from(studies)
        .where(eq(studies.accessionNumber, details.studyId))
        .limit(1);

      if (!existingStudy) {
        await tx.insert(studies).values({
          id: crypto.randomUUID(),
          accessionNumber: details.studyId,
          patientId: patient.id,
          modality: 'CT',
          scanType: details.moduleName || 'CT Scan',
          bodyPart: 'Computed Tomography',
          priority: 'routine',
          status: 'scheduled',
          clinicalHistory: details.existingHistory || '',
          createdAt: new Date() as any,
        });
      }
    }

    // 3. Upsert into hmisInvestigations
    const [existingInv] = await tx
      .select()
      .from(hmisInvestigations)
      .where(eq(hmisInvestigations.investigationId, details.investigationId))
      .limit(1);

    if (existingInv) {
      await tx
        .update(hmisInvestigations)
        .set({
          patientMrn: details.mrn,
          patientName: details.patientName,
          studyAccession: details.studyId || '',
          moduleId: details.moduleId || '',
          moduleName: details.moduleName || '',
          clinicalHistory: details.existingHistory || '',
          reportText: details.existingReport || '',
          impressionText: details.existingImpression || '',
          comments: details.comments || '',
          syncedAt: new Date() as any,
        })
        .where(eq(hmisInvestigations.investigationId, details.investigationId));
    } else {
      await tx.insert(hmisInvestigations).values({
        id: crypto.randomUUID(),
        investigationId: details.investigationId,
        patientMrn: details.mrn,
        patientName: details.patientName,
        studyAccession: details.studyId || '',
        moduleId: details.moduleId || '',
        moduleName: details.moduleName || '',
        status: 'pending',
        clinicalHistory: details.existingHistory || '',
        reportText: details.existingReport || '',
        impressionText: details.existingImpression || '',
        comments: details.comments || '',
        syncedAt: new Date() as any,
        createdAt: new Date() as any,
      });
    }

    return { patientId: patient.id, investigationId: details.investigationId };
  });

  await logAudit({
    userId,
    userName,
    action: 'hmis_investigation_sync',
    entityType: 'HMIS_Investigation',
    entityId: details.investigationId,
    details: `Synced HMIS Investigation #${details.investigationId} for MRN ${details.mrn}`,
  });

  return { success: true, ...result };
}

/**
 * Saves prior reports (Pathology/Radiology) fetched from HMIS into local cache.
 */
export async function syncHmisPriorReports(
  investigationId: string,
  patientMrn: string,
  reportsList: HmisPriorReport[],
  userId?: string,
  userName?: string
): Promise<{ success: boolean; count: number }> {
  for (const report of reportsList) {
    await db.insert(hmisPriorReports).values({
      id: crypto.randomUUID(),
      investigationId,
      patientMrn,
      department: report.department,
      testName: report.testName,
      resultSummary: report.resultSummary || '',
      reportDate: report.date || '',
      status: report.status || 'Reported',
      createdAt: new Date() as any,
    });
  }

  await logAudit({
    userId,
    userName,
    action: 'hmis_prior_reports_sync',
    entityType: 'PatientHistory',
    entityId: patientMrn,
    details: `Cached ${reportsList.length} prior lab/pathology reports for MRN ${patientMrn}`,
  });

  return { success: true, count: reportsList.length };
}

export async function getHmisPriorReports(patientMrn: string) {
  return db
    .select()
    .from(hmisPriorReports)
    .where(eq(hmisPriorReports.patientMrn, patientMrn))
    .orderBy(desc(hmisPriorReports.createdAt));
}

export async function getHmisInvestigation(investigationId: string) {
  const [inv] = await db
    .select()
    .from(hmisInvestigations)
    .where(eq(hmisInvestigations.investigationId, investigationId))
    .limit(1);
  return inv;
}
