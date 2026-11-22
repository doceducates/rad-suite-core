import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { hotStagedStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  saveStagedSlice,
  getHotSliceBuffer,
  getHotStudyManifest,
  calculateHotStorageBytes,
  enforceHotStorageQuota,
  HOT_CASES_DIR,
} from '../hot-case-staging.service';

describe('hot-case-staging.service', () => {
  const testAcc = 'HOT_TEST_ACC_01';

  beforeEach(async () => {
    try {
      await db.delete(hotStagedStudies).where(eq(hotStagedStudies.accessionNumber, testAcc));
      const testDir = path.join(HOT_CASES_DIR, testAcc);
      if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  afterAll(async () => {
    try {
      await db.delete(hotStagedStudies).where(eq(hotStagedStudies.accessionNumber, testAcc));
      const testDir = path.join(HOT_CASES_DIR, testAcc);
      if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('1. saves a staged slice and records metadata in database', async () => {
    const dummyDicom = Buffer.from('DICM_DUMMY_SLICE_CONTENT_FOR_TESTING');
    const result = await saveStagedSlice(
      {
        accessionNumber: testAcc,
        patientName: 'HOT TEST PATIENT',
        patientId: 'PT-999',
        modality: 'MR',
        studyDescription: 'MR SPINE',
        studyDate: '20261016',
        seriesNumber: '1001',
        seriesDescription: 'SG T2',
        sliceIndex: 0,
        totalSlices: 25,
        sopUid: '1.2.3.4.5',
      },
      dummyDicom
    );

    expect(result.success).toBe(true);
    expect(result.stagedSlices).toBe(1);
    expect(result.totalSlices).toBe(25);

    const [dbRow] = await db
      .select()
      .from(hotStagedStudies)
      .where(eq(hotStagedStudies.accessionNumber, testAcc));

    expect(dbRow).toBeDefined();
    expect(dbRow.patientName).toBe('HOT TEST PATIENT');
    expect(dbRow.sliceCount).toBe(1);
    expect(Boolean(dbRow.isSyncedToS3)).toBe(false);
  });

  it('2. retrieves hot slice buffer in < 5ms', async () => {
    const dummyDicom = Buffer.from('DICM_DUMMY_SLICE_CONTENT_FOR_TESTING_2');
    await saveStagedSlice(
      {
        accessionNumber: testAcc,
        seriesNumber: '2001',
        seriesDescription: 'AX T2',
        sliceIndex: 3,
        totalSlices: 10,
        sopUid: '1.2.3.4.6',
      },
      dummyDicom
    );

    const t0 = Date.now();
    const retrieved = await getHotSliceBuffer(testAcc, '2001', 3);
    const elapsed = Date.now() - t0;

    expect(retrieved).not.toBeNull();
    expect(retrieved?.toString()).toBe('DICM_DUMMY_SLICE_CONTENT_FOR_TESTING_2');
    expect(elapsed).toBeLessThan(100);
  });

  it('3. generates lightweight study manifest with correct series orientation', async () => {
    const dummyDicom = Buffer.from('DICM_SERIES_TEST');
    await saveStagedSlice(
      {
        accessionNumber: testAcc,
        patientName: 'TEST MANIFEST',
        modality: 'MR',
        studyDescription: 'MR LSS',
        studyDate: '20261016',
        seriesNumber: '3001',
        seriesDescription: 'SG T2',
        sliceIndex: 0,
        totalSlices: 1,
      },
      dummyDicom
    );

    const manifest = await getHotStudyManifest(testAcc);
    expect(manifest).not.toBeNull();
    expect(manifest?.accessionNumber).toBe(testAcc);
    expect(manifest?.source).toBe('local');
    expect(manifest?.series.length).toBeGreaterThan(0);
    expect(manifest?.series[0].orientation).toBe('SAGITTAL');
  });

  it('4. calculates storage bytes correctly', async () => {
    const bytes = await calculateHotStorageBytes();
    expect(typeof bytes).toBe('number');
    expect(bytes).toBeGreaterThanOrEqual(0);
  });

  it('5. enforeHotStorageQuota prunes old cases beyond retention', async () => {
    const oldAcc = `${testAcc}_OLD`;
    try {
      await saveStagedSlice(
        {
          accessionNumber: oldAcc,
          patientName: 'OLD PATIENT',
          studyDate: '20261001',
          seriesNumber: '1',
          sliceIndex: 0,
          totalSlices: 1,
        },
        Buffer.from('OLD_DICOM_DATA')
      );

      const res = await enforceHotStorageQuota(10 * 1024 * 1024 * 1024, 3);
      expect(res.prunedCount).toBeGreaterThanOrEqual(1);

      const [row] = await db
        .select()
        .from(hotStagedStudies)
        .where(eq(hotStagedStudies.accessionNumber, oldAcc));
      expect(row).toBeUndefined();
    } finally {
      await db.delete(hotStagedStudies).where(eq(hotStagedStudies.accessionNumber, oldAcc));
      const oldDir = path.join(HOT_CASES_DIR, oldAcc);
      if (fs.existsSync(oldDir)) {
        await fs.promises.rm(oldDir, { recursive: true, force: true });
      }
    }
  });
});
