import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db';
import { patients, studies, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getMergeCandidatesForMrn, mergeManualCaseToHmis } from '../case-merge.service';

describe('case-merge.service', () => {
  const testMrn = 'TEST-MRN-999';
  const manualAccession = 'MAN-261006-TEST';
  const hmisAccession = 'HMIS-999999-TEST';

  beforeEach(async () => {
    // Clean up test-specific records only
    try {
      await db.delete(reports).where(eq(reports.id, 'rep-manual-001'));
      await db.delete(studies).where(eq(studies.accessionNumber, manualAccession));
      await db.delete(studies).where(eq(studies.accessionNumber, hmisAccession));
      await db.delete(patients).where(eq(patients.mrNumber, testMrn));
    } catch {}

    // Setup patient
    const patientId = 'p-test-merge-001';
    await db.insert(patients).values({
      id: patientId,
      mrNumber: testMrn,
      fullName: 'Test Merge Patient',
      dob: '1985-05-15',
      age: 41,
      gender: 'Male',
      createdAt: new Date(),
    } as any);

    // Setup manual study & report
    const manualStudyId = 'study-manual-001';
    await db.insert(studies).values({
      id: manualStudyId,
      patientId,
      accessionNumber: manualAccession,
      modality: 'CT',
      scanType: 'CT Brain Plain',
      bodyPart: 'Brain',
      priority: 'routine',
      status: 'scheduled',
      scheduledAt: new Date(),
      isManual: true,
      createdAt: new Date(),
    } as any);

    await db.insert(reports).values({
      id: 'rep-manual-001',
      studyId: manualStudyId,
      patientId,
      status: 'draft',
      findings: 'Manual finding: No acute hemorrhage detected.',
      impression: 'Manual impression: Normal CT brain.',
      technique: 'Plain CT axial cuts.',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Setup official HMIS study
    const hmisStudyId = 'study-hmis-001';
    await db.insert(studies).values({
      id: hmisStudyId,
      patientId,
      accessionNumber: hmisAccession,
      modality: 'CT',
      scanType: 'CT Head Plain',
      bodyPart: 'Brain',
      priority: 'routine',
      status: 'scheduled',
      scheduledAt: new Date(),
      hmisStatus: 'awaiting_report',
      isManual: false,
      createdAt: new Date(),
    } as any);
  });

  it('retrieves merge candidates for the same MRN', async () => {
    const candidates = await getMergeCandidatesForMrn(testMrn);
    expect(candidates.length).toBe(2);
    const accessions = candidates.map((c) => c.accessionNumber);
    expect(accessions).toContain(manualAccession);
    expect(accessions).toContain(hmisAccession);
  });

  it('successfully merges manual findings into official HMIS case and marks manual as cancelled', async () => {
    const result = await mergeManualCaseToHmis(
      {
        sourceAccession: manualAccession,
        targetAccession: hmisAccession,
        notes: 'Test merge execution',
      },
      { id: 'user-001', name: 'Dr. Test', role: 'radiologist' }
    );

    expect(result.success).toBe(true);
    expect(result.targetAccession).toBe(hmisAccession);

    // Verify candidates after merge
    const candidates = await getMergeCandidatesForMrn(testMrn);
    const manualEntry = candidates.find((c) => c.accessionNumber === manualAccession);
    expect(manualEntry?.status).toBe('cancelled');

    // Verify target study now has the report findings and in_progress status
    const [targetReport] = await db.select().from(reports).where(eq(reports.studyId, 'study-hmis-001')).limit(1);
    expect(targetReport).toBeDefined();
    expect(targetReport.findings).toContain('No acute hemorrhage detected');
    expect(targetReport.impression).toContain('Normal CT brain');

    const [targetStudy] = await db.select().from(studies).where(eq(studies.id, 'study-hmis-001')).limit(1);
    expect(targetStudy.status).toBe('in_progress');
    expect(targetStudy.assignedRadiologistId).toBe('user-001');
  });
});
