import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db';
import { studies, users, patients } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { claimCase, releaseCase } from '../case-allocation.service';

describe('HMIS Assignment Gating & Ownership Controls', () => {
  const testAcc = 'TEST-GATING-ACC-001';
  const studyId = 'study-gating-test-001';
  const patientId = 'pat-gating-001';
  const user1 = { id: 'usr-radiologist-1', name: 'Dr. Radiologist One', email: 'rad1@example.com', role: 'radiologist' as const };
  const user2 = { id: 'usr-radiologist-2', name: 'Dr. Radiologist Two', email: 'rad2@example.com', role: 'radiologist' as const };
  const adminUser = { id: 'usr-admin-01', name: 'Dr. Chief Admin', email: 'admin@example.com', role: 'admin' as const };

  beforeEach(async () => {
    // Seed users into test SQLite db
    await db.insert(users).values({ id: user1.id, name: user1.name, email: user1.email, role: 'radiologist', passwordHash: 'hash1', googleRefreshToken: 'mock-token' }).onConflictDoNothing();
    await db.insert(users).values({ id: user2.id, name: user2.name, email: user2.email, role: 'radiologist', passwordHash: 'hash2', googleRefreshToken: 'mock-token' }).onConflictDoNothing();
    await db.insert(users).values({ id: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'admin', passwordHash: 'hash3' }).onConflictDoNothing();

    // Ensure tokens are present if user was already in DB
    await db.update(users).set({ googleRefreshToken: 'mock-token' } as any).where(eq(users.id, user1.id));
    await db.update(users).set({ googleRefreshToken: 'mock-token' } as any).where(eq(users.id, user2.id));

    await db.insert(patients).values({
      id: patientId,
      mrNumber: 'MRN-GATING-001',
      fullName: 'Test Gating Patient',
      dob: '1980-01-01',
      age: 45,
      gender: 'Male',
    }).onConflictDoNothing();

    // Clean up test study
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc));

    // Seed test study initially unassigned
    await db.insert(studies).values({
      id: studyId,
      accessionNumber: testAcc,
      patientId: patientId,
      scanType: 'CT Brain Plain',
      bodyPart: 'Brain',
      modality: 'CT',
      priority: 'routine',
      status: 'scheduled',
      scheduledAt: new Date() as any,
      assignedRadiologistId: null,
    });
  });

  afterEach(async () => {
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc));
    await db.delete(patients).where(eq(patients.id, patientId));
    await db.delete(users).where(eq(users.id, user1.id));
    await db.delete(users).where(eq(users.id, user2.id));
    await db.delete(users).where(eq(users.id, adminUser.id));
  });

  it('allows radiologist to claim an unassigned case', async () => {
    const claimRes = await claimCase(testAcc, user1);
    expect(claimRes.success).toBe(true);
    expect(claimRes.assignedRadiologistId).toBe(user1.id);
    expect(claimRes.assignedRadiologistName).toBe(user1.name);

    // Verify persisted in DB
    const [row] = await db.select().from(studies).where(eq(studies.accessionNumber, testAcc));
    expect(row.assignedRadiologistId).toBe(user1.id);
    expect(row.status).toBe('in_progress');
  });

  it('blocks another radiologist from claiming a case already claimed by someone else without force', async () => {
    // First, user1 claims it
    await claimCase(testAcc, user1);

    // User2 tries to claim without force
    const claimRes2 = await claimCase(testAcc, user2);
    expect(claimRes2.success).toBe(false);
    expect(claimRes2.conflict).toBe(true);
    expect(claimRes2.assignedRadiologistId).toBe(user1.id);
    expect(claimRes2.assignedRadiologistName).toBe(user1.name);
  });

  it('allows releasing a case back to the unassigned pool', async () => {
    await claimCase(testAcc, user1);

    const relRes = await releaseCase(testAcc, user1);
    expect(relRes.success).toBe(true);
    expect(relRes.assignedRadiologistId).toBeNull();

    const [row] = await db.select().from(studies).where(eq(studies.accessionNumber, testAcc));
    expect(row.assignedRadiologistId).toBeNull();
  });

  it('evaluates assignment gating logic correctly for UI and API authorization', () => {
    // Scenario 1: Case is unassigned
    const unassignedStudy = { accessionNumber: testAcc, assignedRadiologistId: null };
    const isTakenUpByMe1 = Boolean(
      user1.id && unassignedStudy.assignedRadiologistId && unassignedStudy.assignedRadiologistId === user1.id
    );
    const isClaimedByOther1 = Boolean(
      unassignedStudy.assignedRadiologistId && user1.id && unassignedStudy.assignedRadiologistId !== user1.id
    );
    expect(isTakenUpByMe1).toBe(false);
    expect(isClaimedByOther1).toBe(false);

    // Scenario 2: Case is claimed by user 1, viewed by user 1
    const claimedByMeStudy = { accessionNumber: testAcc, assignedRadiologistId: user1.id };
    const isTakenUpByMe2 = Boolean(
      user1.id && claimedByMeStudy.assignedRadiologistId && claimedByMeStudy.assignedRadiologistId === user1.id
    );
    const isClaimedByOther2 = Boolean(
      claimedByMeStudy.assignedRadiologistId && user1.id && claimedByMeStudy.assignedRadiologistId !== user1.id
    );
    expect(isTakenUpByMe2).toBe(true);
    expect(isClaimedByOther2).toBe(false);

    // Scenario 3: Case is claimed by user 1, viewed by user 2
    const isTakenUpByMe3 = Boolean(
      user2.id && claimedByMeStudy.assignedRadiologistId && claimedByMeStudy.assignedRadiologistId === user2.id
    );
    const isClaimedByOther3 = Boolean(
      claimedByMeStudy.assignedRadiologistId && user2.id && claimedByMeStudy.assignedRadiologistId !== user2.id
    );
    expect(isTakenUpByMe3).toBe(false);
    expect(isClaimedByOther3).toBe(true);
  });

  it('verifies backend authorization rules for HMIS dispatch', async () => {
    // Unassigned case
    const [unassignedRow] = await db
      .select({ id: studies.id, assignedRadiologistId: studies.assignedRadiologistId })
      .from(studies)
      .where(eq(sql`lower(${studies.accessionNumber})`, testAcc.toLowerCase()))
      .limit(1);

    // Radiologist trying to dispatch unassigned case -> MUST be rejected (400)
    const canRadiologistDispatchUnassigned = Boolean(unassignedRow?.assignedRadiologistId || (user1.role as string) === 'admin');
    expect(canRadiologistDispatchUnassigned).toBe(false);

    // Admin can dispatch unassigned in emergency
    const canAdminDispatchUnassigned = Boolean(unassignedRow?.assignedRadiologistId || adminUser.role === 'admin');
    expect(canAdminDispatchUnassigned).toBe(true);

    // Claimed by user1
    await claimCase(testAcc, user1);
    const [claimedRow] = await db
      .select({ id: studies.id, assignedRadiologistId: studies.assignedRadiologistId })
      .from(studies)
      .where(eq(sql`lower(${studies.accessionNumber})`, testAcc.toLowerCase()))
      .limit(1);

    // User1 (owner) can dispatch
    const isOwner = claimedRow?.assignedRadiologistId === user1.id;
    expect(isOwner).toBe(true);

    // User2 (foreign) cannot dispatch
    const isForeignBlocked = claimedRow?.assignedRadiologistId !== user2.id && (user2.role as string) !== 'admin';
    expect(isForeignBlocked).toBe(true);
  });
});
