import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { hotStagedStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as s3Client from '../s3-client';
import { HOT_CASES_DIR } from '../hot-case-staging.service';
import { tickArchivalPass, getArchivalStats } from '../hot-case-archiver.service';

describe('hot-case-archiver.service', () => {
  const completeAcc = 'ARCH_TEST_COMPLETE_01';
  const incompleteAcc = 'ARCH_TEST_INCOMPLETE_02';

  async function cleanup() {
    for (const acc of [completeAcc, incompleteAcc]) {
      try {
        await db.delete(hotStagedStudies).where(eq(hotStagedStudies.accessionNumber, acc));
        const dir = path.join(HOT_CASES_DIR, acc);
        if (fs.existsSync(dir)) {
          await fs.promises.rm(dir, { recursive: true, force: true });
        }
      } catch {}
    }
  }

  beforeEach(async () => {
    await cleanup();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await cleanup();
    vi.restoreAllMocks();
  });

  it('archives settled complete study as a single ZIP + manifest and skips unsettled incomplete study', async () => {
    vi.spyOn(s3Client, 'getEffectiveS3Credentials').mockReturnValue({
      enabled: true,
      endpoint: 'https://s3.sehatai.org',
      region: 'us-east-1',
      bucket: 'rad-suite',
      accessKeyId: 'TEST_KEY',
      secretAccessKey: 'TEST_SECRET',
      forcePathStyle: true,
    });

    const putSpy = vi.spyOn(s3Client, 's3HttpRequest').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
      arrayBuffer: async () => Buffer.alloc(0),
    });

    // 1. Complete, settled study (last slice staged 60s ago)
    const completeSeries = path.join(HOT_CASES_DIR, completeAcc, 'series-1_AX_T2');
    fs.mkdirSync(completeSeries, { recursive: true });
    fs.writeFileSync(path.join(completeSeries, '0001_s1.dcm'), Buffer.from('DICOM_1'));
    fs.writeFileSync(path.join(completeSeries, '0002_s2.dcm'), Buffer.from('DICOM_2'));

    const settledAt = new Date(Date.now() - 60_000).toISOString();
    await db.insert(hotStagedStudies).values({
      accessionNumber: completeAcc,
      patientName: 'TEST PATIENT',
      patientId: 'P1',
      modality: 'MR',
      studyDescription: 'MR BRAIN',
      studyDate: '20991231',
      studyTime: '120000',
      studyInstanceUid: '1.2.3.4',
      sliceCount: 2,
      totalSlices: 2,
      sizeBytes: 14,
      isSyncedToS3: false,
      s3SyncedSliceCount: 0,
      lastSliceStagedAt: settledAt,
      createdAt: settledAt,
      updatedAt: settledAt,
    });

    // 2. Incomplete, actively uploading study (2 of 20 slices staged 2s ago)
    const incompleteSeries = path.join(HOT_CASES_DIR, incompleteAcc, 'series-1_AX_T2');
    fs.mkdirSync(incompleteSeries, { recursive: true });
    fs.writeFileSync(path.join(incompleteSeries, '0001_s1.dcm'), Buffer.from('DICOM_A'));

    const activeAt = new Date(Date.now() - 2_000).toISOString();
    await db.insert(hotStagedStudies).values({
      accessionNumber: incompleteAcc,
      patientName: 'ACTIVE PATIENT',
      patientId: 'P2',
      modality: 'MR',
      studyDescription: 'MR SPINE',
      studyDate: '20991231',
      studyTime: '120500',
      studyInstanceUid: '1.2.3.5',
      sliceCount: 1,
      totalSlices: 20,
      sizeBytes: 7,
      isSyncedToS3: false,
      s3SyncedSliceCount: 0,
      lastSliceStagedAt: activeAt,
      createdAt: activeAt,
      updatedAt: activeAt,
    });

    const res = await tickArchivalPass();
    expect(res.completedStudies).toBeGreaterThanOrEqual(1);
    expect(res.archivedSlices).toBeGreaterThanOrEqual(2);

    // Verify S3 received .zip + .manifest.json for completeAcc, nothing for incompleteAcc, and zero .dcm PUTs
    const putUrls = putSpy.mock.calls.map((c) => String(c[1]));
    expect(putUrls.some((u) => u.includes(completeAcc) && u.endsWith('.zip'))).toBe(true);
    expect(putUrls.some((u) => u.includes(completeAcc) && u.endsWith('.manifest.json'))).toBe(true);
    expect(putUrls.some((u) => u.includes(incompleteAcc))).toBe(false);
    expect(putUrls.some((u) => u.endsWith('.dcm'))).toBe(false);

    const [completeRow] = await db.select().from(hotStagedStudies).where(eq(hotStagedStudies.accessionNumber, completeAcc));
    const [incompleteRow] = await db.select().from(hotStagedStudies).where(eq(hotStagedStudies.accessionNumber, incompleteAcc));
    expect(Boolean(completeRow.isSyncedToS3)).toBe(true);
    expect(Boolean(incompleteRow.isSyncedToS3)).toBe(false);
    expect(getArchivalStats().lastError).toBeNull();
  });
});
