import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getS3StudySeries,
  getS3SliceBuffer,
  createS3StudyZipBuffer,
  clearS3SeriesCache,
} from '../s3-retrieval.service';
import { s3HttpGet } from '../s3-client';

const CACHE_DIR = path.join(process.cwd(), 'storage', 'cache', 's3');

function cleanupTestCache(accession: string) {
  const safe = accession.replace(/[^a-zA-Z0-9._-]/g, '_');
  const p = path.join(CACHE_DIR, safe);
  if (fs.existsSync(p)) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch {}
  }
}

vi.mock('../s3-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../s3-client')>();
  return {
    ...actual,
    getEffectiveS3Credentials: vi.fn(() => ({
      enabled: true,
      endpoint: 'http://127.0.0.1:9000',
      region: 'us-east-1',
      bucket: 'test-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      forcePathStyle: true,
    })),
    s3HttpGet: vi.fn(),
  };
});

describe('S3 Retrieval Services', () => {
  const testAccessions = [
    'ACC_MULTI_TEST',
    'ACC_SLICE_TEST',
    'ACC_ZIP_TEST',
    'ACC_TIMEOUT_TEST',
    'ACC_CACHE_HIT',
    'ACC_INVALID_SERIES',
    'NON_EXISTENT_ACCESSION_99999',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearS3SeriesCache();
    testAccessions.forEach(cleanupTestCache);
  });

  afterEach(() => {
    testAccessions.forEach(cleanupTestCache);
  });

  it('gracefully handles empty accession when S3 is queried', async () => {
    vi.mocked(s3HttpGet).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<ListBucketResult></ListBucketResult>',
      arrayBuffer: async () => Buffer.from([]),
    });

    const series = await getS3StudySeries('NON_EXISTENT_ACCESSION_99999');
    expect(Array.isArray(series)).toBe(true);
    expect(series.length).toBe(0);
    expect(s3HttpGet).toHaveBeenCalled();
  });

  it('returns null for non-existent slice buffer safely', async () => {
    vi.mocked(s3HttpGet).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<ListBucketResult></ListBucketResult>',
      arrayBuffer: async () => Buffer.from([]),
    });

    const buf = await getS3SliceBuffer('NON_EXISTENT_ACCESSION_99999', '1', 0);
    expect(buf).toBeNull();
  });

  it('returns null when attempting to zip non-existent study', async () => {
    vi.mocked(s3HttpGet).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<ListBucketResult></ListBucketResult>',
      arrayBuffer: async () => Buffer.from([]),
    });

    const zip = await createS3StudyZipBuffer('NON_EXISTENT_ACCESSION_99999');
    expect(zip).toBeNull();
  });

  it('detects orientation for Sagittal, Coronal, and Axial series and calls s3HttpGet', async () => {
    const mockXml = `
      <ListBucketResult>
        <Contents><Key>dicom/2026/10/MR/ACC_MULTI_TEST/series-1001_AX_T1/slice001.dcm</Key></Contents>
        <Contents><Key>dicom/2026/10/MR/ACC_MULTI_TEST/series-1001_AX_T1/slice002.dcm</Key></Contents>
        <Contents><Key>dicom/2026/10/MR/ACC_MULTI_TEST/series-7001_COR_STIR/slice001.dcm</Key></Contents>
        <Contents><Key>dicom/2026/10/MR/ACC_MULTI_TEST/series-13001_SG_T2/slice001.dcm</Key></Contents>
      </ListBucketResult>
    `;

    vi.mocked(s3HttpGet).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => mockXml,
      arrayBuffer: async () => Buffer.from(mockXml),
    });

    const series = await getS3StudySeries('ACC_MULTI_TEST');

    expect(s3HttpGet).toHaveBeenCalledTimes(1);
    expect(series).toHaveLength(3);

    const ax = series.find((s) => s.seriesNumber === '1001');
    expect(ax?.orientation).toBe('AXIAL');
    expect(ax?.sliceCount).toBe(2);

    const cor = series.find((s) => s.seriesNumber === '7001');
    expect(cor?.orientation).toBe('CORONAL');

    const sg = series.find((s) => s.seriesNumber === '13001');
    expect(sg?.orientation).toBe('SAGITTAL');
  });

  it('fetches slice buffer using s3HttpGet', async () => {
    const mockXml = `
      <ListBucketResult>
        <Contents><Key>dicom/2026/10/MR/ACC_SLICE_TEST/series-1_AX_T1/slice001.dcm</Key></Contents>
      </ListBucketResult>
    `;
    const sliceBufferData = Buffer.from('FAKE_DICOM_DATA_123');

    vi.mocked(s3HttpGet)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockXml,
        arrayBuffer: async () => Buffer.from(mockXml),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
        arrayBuffer: async () => sliceBufferData,
      });

    const buf = await getS3SliceBuffer('ACC_SLICE_TEST', '1', 0);
    expect(buf).toEqual(sliceBufferData);
    expect(s3HttpGet).toHaveBeenCalledTimes(2);
  });

  it('downloads instances with s3HttpGet when creating zip buffer', async () => {
    const mockXml = `
      <ListBucketResult>
        <Contents><Key>dicom/2026/10/MR/ACC_ZIP_TEST/series-1_AX/sop1.dcm</Key></Contents>
      </ListBucketResult>
    `;
    const dcmData = Buffer.from('DCM_ZIP_PAYLOAD');

    vi.mocked(s3HttpGet)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockXml,
        arrayBuffer: async () => Buffer.from(mockXml),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
        arrayBuffer: async () => dcmData,
      });

    const zip = await createS3StudyZipBuffer('ACC_ZIP_TEST');
    expect(zip).not.toBeNull();
    expect(Buffer.isBuffer(zip)).toBe(true);
    expect(s3HttpGet).toHaveBeenCalledTimes(2);
    expect(s3HttpGet).toHaveBeenLastCalledWith(
      expect.stringContaining('sop1.dcm'),
      expect.any(Object),
      15000
    );
  });

  it('handles network rejections gracefully without throwing', async () => {
    vi.mocked(s3HttpGet).mockRejectedValueOnce(new Error('ETIMEDOUT'));
    const series = await getS3StudySeries('ACC_TIMEOUT_TEST');
    expect(series).toEqual([]);

    const buf = await getS3SliceBuffer('ACC_TIMEOUT_TEST', '1', 0);
    expect(buf).toBeNull();
  });

  it('reuses cached series data on cache hit without extra network calls', async () => {
    const mockXml = `
      <ListBucketResult>
        <Contents><Key>dicom/2026/10/MR/ACC_CACHE_HIT/series-1_AX/sop1.dcm</Key></Contents>
      </ListBucketResult>
    `;
    vi.mocked(s3HttpGet).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => mockXml,
      arrayBuffer: async () => Buffer.from(mockXml),
    });

    const first = await getS3StudySeries('ACC_CACHE_HIT');
    expect(first).toHaveLength(1);
    expect(s3HttpGet).toHaveBeenCalledTimes(1);

    const second = await getS3StudySeries('ACC_CACHE_HIT');
    expect(second).toEqual(first);
    expect(s3HttpGet).toHaveBeenCalledTimes(1);
  });

  it('returns null when specified seriesNumber does not exist', async () => {
    const mockXml = `
      <ListBucketResult>
        <Contents><Key>dicom/2026/10/MR/ACC_INVALID_SERIES/series-1_AX/sop1.dcm</Key></Contents>
      </ListBucketResult>
    `;
    vi.mocked(s3HttpGet).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => mockXml,
      arrayBuffer: async () => Buffer.from(mockXml),
    });

    const buf = await getS3SliceBuffer('ACC_INVALID_SERIES', '999', 0);
    expect(buf).toBeNull();
  });

  it('safely handles path traversal characters in accession and seriesNumber', async () => {
    vi.mocked(s3HttpGet).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<ListBucketResult></ListBucketResult>',
      arrayBuffer: async () => Buffer.from([]),
    });
    const buf = await getS3SliceBuffer('../../../etc/passwd', '../../cmd', 0);
    expect(buf).toBeNull();
  });
});
