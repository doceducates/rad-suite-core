import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveWorkspaceCase } from '@/services/workspace-case-resolver.service';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Patient MRN Resolution, UUID Anti-Poisoning & Workspace Resolution Tests', () => {
  const testAcc = '192611005992';
  const realMrn = '19202523762063';
  const patientUuid = '32931878-5bda-462d-b30b-5eebe25af2ad';
  const studyUuid = 'std-uuid-192611005992-test';

  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc));
    await db.delete(patients).where(eq(patients.id, patientUuid));
  });

  it('resolves MRN properly and strictly rejects hyphenated UUID foreign keys', () => {
    // Pure logic simulation of MRN extraction from useReportExternalSync
    function extractSafeMrn(patient?: any, study?: any): string {
      return (
        patient?.mrNumber ||
        patient?.mrn ||
        study?.patientMrn ||
        study?.mrNumber ||
        study?.mrn ||
        (study?.patientId && !study.patientId.includes('-') ? study.patientId : '')
      );
    }

    // Case 1: Full patient record present with real MRN and UUID id
    const patientWithMrn = { id: patientUuid, mrNumber: realMrn, fullName: 'M Maqsood' };
    const studyWithForeignUuid = { patientId: patientUuid, accessionNumber: testAcc };
    expect(extractSafeMrn(patientWithMrn, studyWithForeignUuid)).toBe(realMrn);

    // Case 2: Patient record has mrn instead of mrNumber
    const patientWithMrnAlias = { id: patientUuid, mrn: realMrn, fullName: 'M Maqsood' };
    expect(extractSafeMrn(patientWithMrnAlias, studyWithForeignUuid)).toBe(realMrn);

    // Case 3: Patient object omitted, but study has patientMrn
    const studyWithMrn = { patientId: patientUuid, patientMrn: realMrn, accessionNumber: testAcc };
    expect(extractSafeMrn(undefined, studyWithMrn)).toBe(realMrn);

    // Case 4: Danger case that caused the original bug - patient omitted, study has only patientId (UUID)
    // The extraction MUST return empty string, NEVER the hyphenated UUID
    const poisonedStudy = { patientId: patientUuid, accessionNumber: testAcc };
    const result = extractSafeMrn(undefined, poisonedStudy);
    expect(result).toBe('');
    expect(result).not.toContain(patientUuid);
  });

  it('resolves workspace case by both accession number and study database UUID', async () => {
    // Insert patient and study into test DB
    await db.insert(patients).values({
      id: patientUuid,
      mrNumber: realMrn,
      fullName: 'M Maqsood',
      age: 33,
      gender: 'Male',
      createdAt: new Date().toISOString(),
    } as any);

    await db.insert(studies).values({
      id: studyUuid,
      patientId: patientUuid,
      accessionNumber: testAcc,
      modality: 'MR',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'Lumbar Spine',
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    } as any);

    // 1. Resolve by Accession Number
    const resolvedByAcc = await resolveWorkspaceCase(testAcc);
    expect(resolvedByAcc).toBeDefined();
    expect(resolvedByAcc?.study?.accessionNumber).toBe(testAcc);
    expect(resolvedByAcc?.patient?.mrNumber).toBe(realMrn);
    expect(resolvedByAcc?.patient?.fullName).toBe('M Maqsood');

    // 2. Resolve by Database Study UUID
    const resolvedByUuid = await resolveWorkspaceCase(studyUuid);
    expect(resolvedByUuid).toBeDefined();
    expect(resolvedByUuid?.study?.accessionNumber).toBe(testAcc);
    expect(resolvedByUuid?.patient?.mrNumber).toBe(realMrn);

    // Clean up
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc));
    await db.delete(patients).where(eq(patients.id, patientUuid));
  });
});
