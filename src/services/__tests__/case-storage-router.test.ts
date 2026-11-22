import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db';
import { users, hotStagedStudies, hospitalPacsStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import {
  getUserStorageTarget,
  tagCaseForUserStorage,
} from '../case-storage-router.service';
import { claimCase } from '../case-allocation.service';
import { encryptSecret } from '@/lib/crypto';

describe('Per-User Storage Routing & Case Isolation Service', () => {
  let adminUserId: string;
  let radiologistWithoutDriveId: string;
  let radiologistWithDriveId: string;

  beforeEach(async () => {
    adminUserId = crypto.randomUUID();
    radiologistWithoutDriveId = crypto.randomUUID();
    radiologistWithDriveId = crypto.randomUUID();

    // 1. Seed Admin
    await db.insert(users).values({
      id: adminUserId,
      name: 'System Admin',
      email: `admin-${crypto.randomBytes(3).toString('hex')}@radsuite.pk`,
      passwordHash: 'dummy',
      role: 'admin',
      storageProvider: 'vps_s3',
      createdAt: new Date(),
    } as any);

    // 2. Seed Radiologist without Google Drive
    await db.insert(users).values({
      id: radiologistWithoutDriveId,
      name: 'Dr. No Drive',
      email: `nodrive-${crypto.randomBytes(3).toString('hex')}@radsuite.pk`,
      passwordHash: 'dummy',
      role: 'radiologist',
      storageProvider: 'auto',
      createdAt: new Date(),
    } as any);

    // 3. Seed Radiologist with linked Google Drive
    await db.insert(users).values({
      id: radiologistWithDriveId,
      name: 'Dr. Drive Connected',
      email: `hasdrive-${crypto.randomBytes(3).toString('hex')}@radsuite.pk`,
      passwordHash: 'dummy',
      role: 'radiologist',
      storageProvider: 'auto',
      googleEmail: 'clinician@hospital.org',
      googleRefreshToken: encryptSecret('1//fake-refresh-token'),
      googleAccessToken: 'fake-access-token',
      createdAt: new Date(),
    } as any);
  });

  it('routes Admin cases to VPS and S3 storage', async () => {
    const target = await getUserStorageTarget(adminUserId);
    expect(target.destination).toBe('vps_s3');
    expect(target.canClaim).toBe(true);
    expect(target.role).toBe('admin');
  });

  it('blocks non-admin users without Google Drive from claiming cases', async () => {
    const target = await getUserStorageTarget(radiologistWithoutDriveId);
    expect(target.destination).toBe('google_drive');
    expect(target.canClaim).toBe(false);
    expect(target.reason).toBe('GOOGLE_DRIVE_REQUIRED');

    // Test case claim rejection
    const claimRes = await claimCase('ACC-TEST-9901', {
      id: radiologistWithoutDriveId,
      name: 'Dr. No Drive',
    });
    expect(claimRes.success).toBe(false);
    expect(claimRes.code).toBe('GOOGLE_DRIVE_REQUIRED');
  });

  it('permits non-admin users with linked Google Drive to claim cases', async () => {
    const target = await getUserStorageTarget(radiologistWithDriveId);
    expect(target.destination).toBe('google_drive');
    expect(target.canClaim).toBe(true);
    expect(target.googleEmail).toBe('clinician@hospital.org');
  });

  it('tags cases as ephemeral VPS when claimed by non-admin clinician', async () => {
    const testAcc = `ACC-EPH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Seed test hot-staged study
    await db.insert(hotStagedStudies).values({
      accessionNumber: testAcc,
      patientName: 'John Doe',
      patientId: 'PT-100',
      modality: 'MR',
      studyDescription: 'MRI Brain',
      studyDate: '20261022',
      studyTime: '120000',
      studyInstanceUid: `1.2.3.${testAcc}`,
      sliceCount: 20,
      totalSlices: 20,
      sizeBytes: 1048576,
      isSyncedToS3: false,
      s3SyncedSliceCount: 0,
      lastSliceStagedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    await tagCaseForUserStorage(testAcc, radiologistWithDriveId);

    const [updated] = await db
      .select()
      .from(hotStagedStudies)
      .where(eq(hotStagedStudies.accessionNumber, testAcc));

    expect(updated).toBeDefined();
    expect(updated.storageTargetUserId).toBe(radiologistWithDriveId);
    expect(Boolean(updated.isEphemeralVps)).toBe(true);
  });
});
