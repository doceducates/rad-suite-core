import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getS3StudyKeys, getS3StudySeries, clearS3SeriesCache } from '../s3-retrieval.service';
import * as s3Client from '../s3-client';

describe('Task 1: Strict S3 Study Boundary Isolation & Modality Disambiguation', () => {
  beforeEach(() => {
    clearS3SeriesCache();
    vi.restoreAllMocks();
  });

  const mockXmlListing = `<?xml version="1.0" encoding="UTF-8"?>
  <ListBucketResult>
    <Contents>
      <Key>dicom/2026/10/CT/192610002587_NAZEER_1.2.392.200036.9116.2.6.1.16/series-1___2_0/0001_sop1.dcm</Key>
    </Contents>
    <Contents>
      <Key>dicom/2026/10/CT/192610002587_NAZEER_1.2.392.200036.9116.2.6.1.16/series-1___2_0/0002_sop2.dcm</Key>
    </Contents>
    <Contents>
      <Key>dicom/2026/10/MR/192610002587_M_YAQOOB_1.2.392.200036.9116.4.2.9652.1467/series-1_AXIAL/0001_sop3.dcm</Key>
    </Contents>
    <Contents>
      <Key>dicom/2026/10/MR/192610002587_M_YAQOOB_1.2.392.200036.9116.4.2.9652.1467/series-1_AXIAL/0002_sop4.dcm</Key>
    </Contents>
    <Contents>
      <Key>dicom/2026/10/MR/192610002587_M_YAQOOB_1.2.392.200036.9116.4.2.9652.1467/series-2_SAGITTAL/0001_sop5.dcm</Key>
    </Contents>
  </ListBucketResult>`;

  it('isolates MR slices when modality=MR is specified, ignoring CT slices for same accession', async () => {
    vi.spyOn(s3Client, 'getEffectiveS3Credentials').mockReturnValue({
      enabled: true,
      endpoint: 'https://s3.example.com',
      bucket: 'test-bucket',
      region: 'us-east-1',
    } as any);

    vi.spyOn(s3Client, 's3HttpGet').mockResolvedValue({
      ok: true,
      text: async () => mockXmlListing,
    } as any);

    const mrKeys = await getS3StudyKeys('192610002587', { modality: 'MR' });
    expect(mrKeys).toHaveLength(3);
    expect(mrKeys.every((k) => k.includes('/MR/'))).toBe(true);
    expect(mrKeys.some((k) => k.includes('/CT/'))).toBe(false);
  });

  it('isolates CT slices when modality=CT is specified, ignoring MR slices for same accession', async () => {
    vi.spyOn(s3Client, 'getEffectiveS3Credentials').mockReturnValue({
      enabled: true,
      endpoint: 'https://s3.example.com',
      bucket: 'test-bucket',
      region: 'us-east-1',
    } as any);

    vi.spyOn(s3Client, 's3HttpGet').mockResolvedValue({
      ok: true,
      text: async () => mockXmlListing,
    } as any);

    const ctKeys = await getS3StudyKeys('192610002587', { modality: 'CT' });
    expect(ctKeys).toHaveLength(2);
    expect(ctKeys.every((k) => k.includes('/CT/'))).toBe(true);
    expect(ctKeys.some((k) => k.includes('/MR/'))).toBe(false);
  });

  it('getS3StudySeries builds series exclusively for the requested modality without cross-contamination', async () => {
    vi.spyOn(s3Client, 'getEffectiveS3Credentials').mockReturnValue({
      enabled: true,
      endpoint: 'https://s3.example.com',
      bucket: 'test-bucket',
      region: 'us-east-1',
    } as any);

    vi.spyOn(s3Client, 's3HttpGet').mockResolvedValue({
      ok: true,
      text: async () => mockXmlListing,
    } as any);

    const mrSeries = await getS3StudySeries('192610002587', { modality: 'MR' });
    expect(mrSeries).toHaveLength(2);
    expect(mrSeries[0].seriesDescription).toContain('AXIAL');
    expect(mrSeries[0].sliceCount).toBe(2);
    expect(mrSeries[1].seriesDescription).toContain('SAGITTAL');
    expect(mrSeries[1].sliceCount).toBe(1);

    // Verify all slice keys belong to MR folder
    const allMrSliceKeys = mrSeries.flatMap((s) => s.keys);
    expect(allMrSliceKeys.every((k) => k.includes('/MR/'))).toBe(true);
  });
});
