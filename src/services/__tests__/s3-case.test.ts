import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadStudyToS3, uploadReportToS3, queryS3Studies, clearS3DiscoveryCache } from '../s3-case.service';
import * as s3Client from '../s3-client';
import { syncStudyToCloud } from '../cloud-sync.service';
import { saveUnifiedStorageSettings } from '../storage-config.service';

describe('S3 Clinical Taxonomy & Storage Sync', () => {
  beforeEach(() => {
    saveUnifiedStorageSettings({
      s3Enabled: true,
      s3Endpoint: 'https://s3.sehatai.org',
      s3Region: 'us-east-1',
      s3Bucket: 'rad-suite',
      s3AccessKeyId: 'TGS3zn9NpfdAUlXNKFi',
      s3SecretAccessKey: 'mfYLYcLTfxY8hEU1qrtPedNJhGEDQH',
      s3ForcePathStyle: true,
    });
  });

  it('builds compliant clinical taxonomy for DICOM study upload', async () => {
    // Mock global fetch to verify payload & URL structure
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any, opts: any) => {
      return new Response('', { status: 200, headers: { ETag: '"abc"' } });
    });

    const res = await uploadStudyToS3({
      accessionNumber: 'ACC-8801',
      patientName: 'JOHN DOE',
      modality: 'CT',
      studyDate: '2026-10-04',
      studyInstanceUid: '1.2.840.113619.1',
      seriesNumber: 1,
      seriesDescription: 'AXIAL_5MM',
      files: [
        { filename: 'slice1.dcm', buffer: Buffer.from('DICOM_DATA_1') },
        { filename: 'slice2.dcm', buffer: Buffer.from('DICOM_DATA_2') },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.uploadedCount).toBe(2);
    expect(res.s3Keys[0]).toMatch(/^dicom\/2026\/10\/CT\/ACC-8801_JOHN_DOE_1\.2\.840\.113619\.1\/series-1_AXIAL_5MM\/slice1\.dcm$/);
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('uploads clinical report into organized reports taxonomy', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response('', { status: 200 });
    });

    const res = await uploadReportToS3({
      accessionNumber: 'ACC-8801',
      patientName: 'JOHN DOE',
      modality: 'CT',
      reportDate: '2026-10-04',
      content: JSON.stringify({ impression: 'Normal CT Brain' }),
      format: 'json',
    });

    expect(res.success).toBe(true);
    expect(res.s3Key).toMatch(/^reports\/2026\/10\/CT\/ACC-8801\/report_ACC-8801\.json$/);

    fetchSpy.mockRestore();
  });

  it('queries S3 studies with modality-filtered prefixes', async () => {
    clearS3DiscoveryCache();
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
    <ListBucketResult>
      <Contents>
        <Key>dicom/2026/10/CT/ACC9901_AHMED_ALI_1.2.3/series-1_AXIAL/sop1.dcm</Key>
      </Contents>
    </ListBucketResult>`;

    const httpSpy = vi.spyOn(s3Client, 's3HttpGet').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => mockXml,
      arrayBuffer: async () => Buffer.from(mockXml),
    });

    const results = await queryS3Studies({ modality: 'CT' });
    expect(results.length).toBe(1);
    expect(results[0].accessionNumber).toBe('ACC9901');
    expect(results[0].patientName).toBe('AHMED ALI');
    expect(results[0].modality).toBe('CT');
    expect(results[0].source).toBe('s3');

    httpSpy.mockRestore();
    clearS3DiscoveryCache();
  });

  it('coordinates dual sync with cloud-sync service', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response('', { status: 200 });
    });

    const syncResult = await syncStudyToCloud({
      accessionNumber: 'ACC-9999',
      patientName: 'FATIMA NOOR',
      modality: 'MR',
      studyDate: '2026-10-04',
      reportContent: 'Impression: Normal MR Brain',
      reportFormat: 'pdf',
    });

    expect(syncResult.accessionNumber).toBe('ACC-9999');
    expect(syncResult.s3.attempted).toBe(true);
    expect(syncResult.s3.success).toBe(true);

    fetchSpy.mockRestore();
  });
});
