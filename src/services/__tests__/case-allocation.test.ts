import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { studies, patients, users, hospitalPacsStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { claimCase, releaseCase, getCaseClaimStatus, batchClaimCases, batchReleaseCases } from '../case-allocation.service';

describe('Case Allocation & Collision Lock Service', () => {
  const testPatientId = 'f1111111-1111-4111-8111-111111111111';
  const testStudyId = 'f2222222-2222-4222-8222-222222222222';
  const testAccession = 'TEST_ACC_ALLOC_001';
  const testStudyIdCompanion = 'f3333333-3333-4333-8333-333333333333';
  const testAccessionCompanion = 'TEST_ACC_ALLOC_002';

  const userA = { id: 'u1111111-1111-4111-8111-111111111111', name: 'Dr. Usman (PGR)' };
  const userB = { id: 'u2222222-2222-4222-8222-222222222222', name: 'Dr. Fatima (PGR)' };

  beforeAll(async () => {
    // Clean up if existing
    try {
      await db.delete(studies).where(eq(studies.id, testStudyId));
      await db.delete(studies).where(eq(studies.id, testStudyIdCompanion));
      await db.delete(patients).where(eq(patients.id, testPatientId));
      await db.delete(users).where(eq(users.id, userA.id));
      await db.delete(users).where(eq(users.id, userB.id));
    } catch {}

    // Seed test users
    await db.insert(users).values([
      {
        id: userA.id,
        email: 'usman@hospital.gov.pk',
        name: userA.name,
        role: 'radiologist',
        passwordHash: 'dummy_hash',
        googleRefreshToken: 'mock-refresh-token',
      },
      {
        id: userB.id,
        email: 'fatima@hospital.gov.pk',
        name: userB.name,
        role: 'radiologist',
        passwordHash: 'dummy_hash',
        googleRefreshToken: 'mock-refresh-token',
      },
    ]);

    // Seed test patient & study
    await db.insert(patients).values({
      id: testPatientId,
      mrNumber: 'MRN_TEST_ALLOC_01',
      fullName: 'Test Patient Alloc',
      gender: 'Male',
      dob: '1985-01-01',
      age: 39,
    });

    await db.insert(studies).values([
      {
        id: testStudyId,
        accessionNumber: testAccession,
        patientId: testPatientId,
        modality: 'MRI',
        scanType: 'MRI Brain with Contrast',
        bodyPart: 'Brain',
        priority: 'routine',
        status: 'scheduled',
      },
      {
        id: testStudyIdCompanion,
        accessionNumber: testAccessionCompanion,
        patientId: testPatientId,
        modality: 'MRI',
        scanType: 'MRI Cervical Spine',
        bodyPart: 'Spine',
        priority: 'routine',
        status: 'scheduled',
      },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(studies).where(eq(studies.id, testStudyId));
      await db.delete(studies).where(eq(studies.id, testStudyIdCompanion));
      await db.delete(patients).where(eq(patients.id, testPatientId));
      await db.delete(users).where(eq(users.id, userA.id));
      await db.delete(users).where(eq(users.id, userB.id));
    } catch {}
  });

  it('allows a radiologist to claim an available study', async () => {
    const res = await claimCase(testAccession, userA);
    expect(res.success).toBe(true);
    expect(res.assignedRadiologistId).toBe(userA.id);
    expect(res.claimedAt).toBeDefined();

    const status = await getCaseClaimStatus(testAccession);
    expect(status.assignedRadiologistId).toBe(userA.id);
    expect(status.assignedRadiologistName).toBe(userA.name);
  });

  it('prevents collision when another resident tries to claim the same study', async () => {
    const res = await claimCase(testAccession, userB);
    expect(res.success).toBe(false);
    expect(res.conflict).toBe(true);
    expect(res.assignedRadiologistName).toBe(userA.name);

    // Verify study remains assigned to userA
    const status = await getCaseClaimStatus(testAccession);
    expect(status.assignedRadiologistId).toBe(userA.id);
  });

  it('prevents another resident from releasing a study claimed by someone else', async () => {
    const res = await releaseCase(testAccession, userB);
    expect(res.success).toBe(false);
    expect(res.conflict).toBe(true);

    const status = await getCaseClaimStatus(testAccession);
    expect(status.assignedRadiologistId).toBe(userA.id);
  });

  it('allows the claiming resident to release the study back into the pool', async () => {
    const res = await releaseCase(testAccession, userA);
    expect(res.success).toBe(true);
    expect(res.assignedRadiologistId).toBeNull();

    const status = await getCaseClaimStatus(testAccession);
    expect(status.assignedRadiologistId).toBeNull();
  });

  it('batchClaimCases allows claiming multiple studies at once', async () => {
    const result = await batchClaimCases([testAccession, testAccessionCompanion], userB);
    expect(result.claimed.length).toBe(2);
    expect(result.claimed.map((c) => c.accessionNumber)).toContain(testAccession);
    expect(result.claimed.map((c) => c.accessionNumber)).toContain(testAccessionCompanion);

    // Clean up
    await releaseCase(testAccession, userB, false, false);
    await releaseCase(testAccessionCompanion, userB, false, false);
  });

  it('releases companion studies belonging to the patient assigned to the clinician', async () => {
    // Claim both studies for userA
    await claimCase(testAccession, userA);
    await claimCase(testAccessionCompanion, userA);

    // Release with releaseCompanions = true (default)
    const res = await releaseCase(testAccession, userA, false, true);
    expect(res.success).toBe(true);
    expect(res.releasedAccessions).toBeDefined();
    expect(res.releasedAccessions).toContain(testAccession);
    expect(res.releasedAccessions).toContain(testAccessionCompanion);

    // Both should now be unassigned in the database
    const status1 = await getCaseClaimStatus(testAccession);
    const status2 = await getCaseClaimStatus(testAccessionCompanion);
    expect(status1.assignedRadiologistId).toBeNull();
    expect(status2.assignedRadiologistId).toBeNull();
  });

  it('batchReleaseCases releases multiple studies and their companions atomically', async () => {
    // Claim both studies for userA
    await claimCase(testAccession, userA);
    await claimCase(testAccessionCompanion, userA);

    // Batch release with companions
    const result = await batchReleaseCases([testAccession, testAccessionCompanion], userA);
    expect(result.allReleasedAccessions.length).toBe(2);
    expect(result.allReleasedAccessions).toContain(testAccession.toLowerCase());
    expect(result.allReleasedAccessions).toContain(testAccessionCompanion.toLowerCase());

    const status1 = await getCaseClaimStatus(testAccession);
    const status2 = await getCaseClaimStatus(testAccessionCompanion);
    expect(status1.assignedRadiologistId).toBeNull();
    expect(status2.assignedRadiologistId).toBeNull();
  });

  it('claims an unindexed PACS study from hospitalPacsStudies into My Cases by auto-importing', async () => {
    const pacsAccession = 'TEST_ACC_PACS_RESOLVE_001';
    const pacsId = 'f4444444-4444-4444-8444-444444444444';

    try {
      await db.delete(studies).where(eq(studies.accessionNumber, pacsAccession));
      await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, pacsAccession));
    } catch {}

    // Seed into hospitalPacsStudies ONLY (not in studies table yet)
    await db.insert(hospitalPacsStudies).values({
      id: pacsId,
      accessionNumber: pacsAccession,
      patientName: 'PACS ONLY PATIENT',
      patientMrn: 'MRN_PACS_001',
      patientId: 'MRN_PACS_001',
      modality: 'CT',
      studyDescription: 'CT BRAIN PLAIN',
      studyDate: '20261112',
      studyTime: '080000',
      numSeries: 1,
      numInstances: 45,
      pacsSource: 'TEST_PACS',
      s3Status: 'not_uploaded',
    });

    // Claim via accession - this should resolve and claim directly
    const result = await claimCase(pacsAccession, userA);
    expect(result.success).toBe(true);
    expect(result.assignedRadiologistId).toBe(userA.id);

    // Verify study now exists in main studies table and is assigned to userA
    const status = await getCaseClaimStatus(pacsAccession);
    expect(status.success).toBe(true);
    expect(status.assignedRadiologistId).toBe(userA.id);

    // Clean up
    await db.delete(studies).where(eq(studies.accessionNumber, pacsAccession));
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, pacsAccession));
  });
});
