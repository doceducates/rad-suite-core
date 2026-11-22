import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncS3BucketToDatabase, deriveClinicalStudyDescription } from '../s3-catalog-sync.service';
import * as s3Client from '../s3-client';
import { db } from '@/db';
import { hospitalPacsStudies } from '@/db/schema/hospital-pacs';
import { eq } from 'drizzle-orm';

describe('Task 6: Automatic S3 Catalog Crawler & Fresh DB Synchronization', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, '192610002587'));
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, '192610002272'));
  });

  afterEach(async () => {
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, '192610002587'));
    await db.delete(hospitalPacsStudies).where(eq(hospitalPacsStudies.accessionNumber, '192610002272'));
  });

  const mockXmlListing = `<?xml version="1.0" encoding="UTF-8"?>
  <ListBucketResult>
    <Contents>
      <Key>dicom/2026/10/MR/192610002587_M_YAQOOB_1.2.392.200036.9116.4.2.9652.1467/series-1_AXIAL/0001.dcm</Key>
    </Contents>
    <Contents>
      <Key>dicom/2026/10/MR/192610002587_M_YAQOOB_1.2.392.200036.9116.4.2.9652.1467/series-1_AXIAL/0002.dcm</Key>
    </Contents>
    <Contents>
      <Key>dicom/2026/10/MR/192610002587_M_YAQOOB_1.2.392.200036.9116.4.2.9652.1467/series-2_SAGITTAL/0001.dcm</Key>
    </Contents>
    <Contents>
      <Key>dicom/2026/10/MR/192610002272_FAKHRA_1.2.392.200036.9116.4.2.9652.1468/series-1_SAGITTAL/0001.dcm</Key>
    </Contents>
  </ListBucketResult>`;

  it('crawls S3 bucket and populates empty database with synced studies', async () => {
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

    const result = await syncS3BucketToDatabase();
    expect(result.synced).toBe(2);

    // Verify Yaqoob was ingested
    const yaqoob = await db
      .select()
      .from(hospitalPacsStudies)
      .where(eq(hospitalPacsStudies.accessionNumber, '192610002587'));
    expect(yaqoob).toHaveLength(1);
    expect(yaqoob[0].patientName).toBe('M YAQOOB');
    expect(yaqoob[0].modality).toBe('MR');
    expect(yaqoob[0].numInstances).toBe(3);
    expect(yaqoob[0].numSeries).toBe(2);
    expect(yaqoob[0].s3Status).toBe('synced');

    // Verify Fakhra was ingested
    const fakhra = await db
      .select()
      .from(hospitalPacsStudies)
      .where(eq(hospitalPacsStudies.accessionNumber, '192610002272'));
    expect(fakhra).toHaveLength(1);
    expect(fakhra[0].patientName).toBe('FAKHRA');
    expect(fakhra[0].numInstances).toBe(1);
    expect(fakhra[0].s3Status).toBe('synced');
  });

  it('correctly derives clinical study descriptions from scanner protocol series', () => {
    // Sonia / Kalsoom MRI Brain
    const brainSeries = new Set(['series-3001_AX_T2', 'series-4001_AX_FLAIR', 'series-5001_AX_T1', 'series-8002_IsoDWI']);
    expect(deriveClinicalStudyDescription('MR', brainSeries)).toBe('MRI Brain');

    // Gulzara / Rushba Shaheen MRI Brain with Contrast
    const contrastSeries = new Set(['series-10001_AX_T1_C_', 'series-12001_COR___T1_C_', 'series-6001_CO_T2']);
    expect(deriveClinicalStudyDescription('MR', contrastSeries)).toBe('MRI Brain with Contrast');

    // Nasreen MRI Brain & Orbits with Contrast
    const orbitSeries = new Set(['series-10001_AX_T1_FS', 'series-11001_RTSG_T1_FS', 'series-13001_AX_T1_C_']);
    expect(deriveClinicalStudyDescription('MR', orbitSeries)).toBe('MRI Brain & Orbits with Contrast');

    // Sughran / Yaqoob MRI Spine
    const spineSeries = new Set(['series-4001_SG_T2', 'series-5001_SG_T1', 'series-6001_SG_T2_STIR', 'series-8001_AX_T2']);
    expect(deriveClinicalStudyDescription('MR', spineSeries)).toBe('MRI L/S Spine');

    // Nazeer CT Head
    const ctSeries = new Set(['series-1___2_0', 'series-2__Head_10_0']);
    expect(deriveClinicalStudyDescription('CT', ctSeries)).toBe('CT Brain / Head');
  });
});
