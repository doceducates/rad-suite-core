import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { db } from '@/db';
import { hotStagedStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { saveStagedSeriesZip } from '../hot-case-series-zip.service';
import { getHotSliceBuffer, getHotStudyManifest, HOT_CASES_DIR } from '../hot-case-staging.service';

function createZipBuffer(entries: { name: string; content: Buffer }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 1 } });
    const chunks: Buffer[] = [];
    archive.on('data', (c) => chunks.push(c));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    for (const e of entries) {
      archive.append(e.content, { name: e.name });
    }
    archive.finalize();
  });
}

describe('hot-case-series-zip.service', () => {
  const testAcc = 'HOT_ZIP_TEST_99';

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

  it('1. extracts a series zip directly into hot storage and cleans up temporary zip', async () => {
    const zipBuf = await createZipBuffer([
      { name: '0001_slice1.dcm', content: Buffer.from('DICOM_ZIP_SLICE_1') },
      { name: '0002_slice2.dcm', content: Buffer.from('DICOM_ZIP_SLICE_2') },
      { name: '0003_slice3.dcm', content: Buffer.from('DICOM_ZIP_SLICE_3') },
    ]);

    const result = await saveStagedSeriesZip(
      {
        accessionNumber: testAcc,
        patientName: 'ZIP TEST PATIENT',
        patientId: 'PT-ZIP-1',
        modality: 'MR',
        studyDescription: 'MRI SPINE',
        studyDate: '20261017',
        seriesNumber: '1001',
        seriesDescription: 'SG T2 STIR',
        totalStudySlices: 10,
        seriesSliceCount: 3,
      },
      zipBuf
    );

    expect(result.success).toBe(true);
    expect(result.stagedSlices).toBe(3);
    expect(result.newSlicesInSeries).toBe(3);

    // Verify folder exists and contains extracted files
    const seriesDir = path.join(HOT_CASES_DIR, testAcc, 'series-1001_SG_T2_STIR');
    expect(fs.existsSync(seriesDir)).toBe(true);
    const files = await fs.promises.readdir(seriesDir);
    expect(files.length).toBe(3);
    expect(files).toContain('0001_slice1.dcm');
    expect(files).toContain('0002_slice2.dcm');
    expect(files).toContain('0003_slice3.dcm');

    // Verify slice buffers can be fetched with zero latency
    const s1 = await getHotSliceBuffer(testAcc, '1001', 0);
    expect(s1?.toString()).toBe('DICOM_ZIP_SLICE_1');

    const s3 = await getHotSliceBuffer(testAcc, '1001', 2);
    expect(s3?.toString()).toBe('DICOM_ZIP_SLICE_3');
  });

  it('2. handles multiple series and aggregates total study count', async () => {
    const zip1 = await createZipBuffer([
      { name: '0001_a.dcm', content: Buffer.from('SERIES_1_A') },
      { name: '0002_b.dcm', content: Buffer.from('SERIES_1_B') },
    ]);
    const zip2 = await createZipBuffer([
      { name: '0001_c.dcm', content: Buffer.from('SERIES_2_C') },
      { name: '0002_d.dcm', content: Buffer.from('SERIES_2_D') },
      { name: '0003_e.dcm', content: Buffer.from('SERIES_2_E') },
    ]);

    await saveStagedSeriesZip(
      {
        accessionNumber: testAcc,
        seriesNumber: '1001',
        seriesDescription: 'Loc SG',
        totalStudySlices: 5,
      },
      zip1
    );

    const res2 = await saveStagedSeriesZip(
      {
        accessionNumber: testAcc,
        seriesNumber: '2001',
        seriesDescription: 'AX T2',
        totalStudySlices: 5,
      },
      zip2
    );

    expect(res2.stagedSlices).toBe(5);

    const manifest = await getHotStudyManifest(testAcc);
    expect(manifest).not.toBeNull();
    expect(manifest?.series.length).toBe(2);
    expect(manifest?.series[0].seriesNumber).toBe('1001');
    expect(manifest?.series[0].sliceCount).toBe(2);
    expect(manifest?.series[1].seriesNumber).toBe('2001');
    expect(manifest?.series[1].sliceCount).toBe(3);
  });
});
