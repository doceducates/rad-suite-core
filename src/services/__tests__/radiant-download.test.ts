import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createS3StudyZipBuffer } from '../s3-retrieval.service';
import { HOT_CASES_DIR } from '../hot-case-staging.service';

describe('RadiAnt DICOM Download & ZIP Archive', () => {
  it('returns null gracefully when study has 0 keys in S3', async () => {
    const res = await createS3StudyZipBuffer('NON_EXISTENT_ACCESSION_999999');
    expect(res).toBeNull();
  });

  it('returns null gracefully when empty accessions array is passed', async () => {
    const res = await createS3StudyZipBuffer([]);
    expect(res).toBeNull();
  });

  it('creates a valid ZIP buffer when study is present in hot staging storage', async () => {
    const testAcc = 'TEST_HOT_STAGE_DOWNLOAD_999';
    const testStudyDir = path.join(HOT_CASES_DIR, testAcc, 'series-101_AX');
    fs.mkdirSync(testStudyDir, { recursive: true });
    const dummySlice = path.join(testStudyDir, 'slice-001.dcm');
    fs.writeFileSync(dummySlice, Buffer.from('DICM_TEST_MOCK_DATA'));

    try {
      const res = await createS3StudyZipBuffer(testAcc);
      expect(res).not.toBeNull();
      expect(Buffer.isBuffer(res)).toBe(true);
      expect((res as Buffer).length).toBeGreaterThan(0);
      // Verify ZIP magic bytes (PK\x03\x04)
      expect((res as Buffer).subarray(0, 4).toString('hex')).toBe('504b0304');
    } finally {
      fs.rmSync(path.join(HOT_CASES_DIR, testAcc), { recursive: true, force: true });
    }
  });
});
