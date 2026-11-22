// Layer 2 (Domain/Services): External & PACS Case Importer & Auto-Claim Resolver
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { studies, hospitalPacsStudies } from '@/db/schema';
import type { UserContext, ClaimResult } from './case-allocation.service';
import { importStudyToWorklist } from './pacs.service';
import { getUnifiedCase } from './unified-case.service';
import { tagCaseForUserStorage } from './case-storage-router.service';

/**
 * Resolves an unindexed case from Unified Archive or Hospital PACS index,
 * imports it into the database worklist, and claims it for the user.
 */
export async function resolveAndClaimExternalStudy(
  cleanAcc: string,
  user: UserContext
): Promise<ClaimResult | null> {
  // 1. Check Unified Cases / Local Archive
  const uCase = getUnifiedCase(cleanAcc);
  if (uCase) {
    const imp = await importStudyToWorklist(uCase as any, user.id, user.name);
    await db
      .update(studies)
      .set({
        assignedRadiologistId: user.id,
        claimedAt: new Date(),
        status: 'in_progress',
      } as any)
      .where(eq(studies.id, imp.studyId));

    await tagCaseForUserStorage(imp.accessionNumber, user.id);
    return {
      success: true,
      accessionNumber: imp.accessionNumber,
      studyId: imp.studyId,
      assignedRadiologistId: user.id,
      assignedRadiologistName: user.name,
      claimedAt: new Date().toISOString(),
      message: 'Case imported from local archive and added to My Cases successfully',
    };
  }

  // 2. Check Hospital PACS Database Index (hospitalPacsStudies)
  const [pacsRow] = await db
    .select()
    .from(hospitalPacsStudies)
    .where(eq(sql`lower(${hospitalPacsStudies.accessionNumber})`, cleanAcc.toLowerCase()))
    .limit(1);

  if (pacsRow) {
    const imp = await importStudyToWorklist(
      {
        accessionNumber: pacsRow.accessionNumber,
        patientName: pacsRow.patientName || 'Unknown Patient',
        patientMrn: pacsRow.patientMrn || pacsRow.patientId || `MRN-${pacsRow.accessionNumber}`,
        patientId: pacsRow.patientId || pacsRow.patientMrn || pacsRow.accessionNumber,
        modality: pacsRow.modality,
        studyDescription: pacsRow.studyDescription || 'Radiological Examination',
        studyDate: pacsRow.studyDate || new Date().toISOString(),
        studyTime: pacsRow.studyTime || undefined,
        numSeries: pacsRow.numSeries || 1,
        numInstances: pacsRow.numInstances || 1,
        studyInstanceUid: pacsRow.studyInstanceUid || `UID-${pacsRow.accessionNumber}`,
        source: 'hospital_pacs',
        pacsServerAe: pacsRow.pacsSource || 'HOSPITAL_PACS',
        age: (pacsRow as any).age ?? null,
        gender: (pacsRow as any).gender || 'Other',
      } as any,
      user.id,
      user.name
    );

    await db
      .update(studies)
      .set({
        assignedRadiologistId: user.id,
        claimedAt: new Date(),
        status: 'in_progress',
      } as any)
      .where(eq(studies.id, imp.studyId));

    await tagCaseForUserStorage(imp.accessionNumber, user.id);
    return {
      success: true,
      accessionNumber: imp.accessionNumber,
      studyId: imp.studyId,
      assignedRadiologistId: user.id,
      assignedRadiologistName: user.name,
      claimedAt: new Date().toISOString(),
      message: 'Case imported from Hospital PACS and added to My Cases successfully',
    };
  }

  return null;
}
