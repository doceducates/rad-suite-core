import { describe, it, expect } from 'vitest';
import { getSigV4Headers, buildS3Url, getEffectiveS3Credentials } from '../s3-client';

describe('S3 Client Services', () => {
  it('correctly constructs path-style S3 URLs for custom endpoints', () => {
    const creds = {
      enabled: true,
      endpoint: 'https://s3.sehatai.org',
      region: 'us-east-1',
      bucket: 'rad-suite',
      accessKeyId: 'TESTKEY',
      secretAccessKey: 'TESTSECRET',
      forcePathStyle: true,
    };

    const url = buildS3Url(creds, 'dicom/2026/10/CT/ACC123/slice1.dcm');
    expect(url).toBe('https://s3.sehatai.org/rad-suite/dicom/2026/10/CT/ACC123/slice1.dcm');

    const listUrl = buildS3Url(creds, '', { 'list-type': '2', prefix: 'dicom/2026/' });
    expect(listUrl).toContain('https://s3.sehatai.org/rad-suite');
    expect(listUrl).toContain('list-type=2');
    expect(listUrl).toContain('prefix=dicom%2F2026%2F');
  });

  it('generates compliant AWS SigV4 headers with sorted query parameters', () => {
    const headers = getSigV4Headers(
      'GET',
      'https://s3.sehatai.org/rad-suite?prefix=studies&list-type=2',
      'us-east-1',
      'MY_ACCESS_KEY',
      'MY_SECRET_KEY'
    );

    expect(headers.Authorization).toBeDefined();
    expect(headers.Authorization).toContain('AWS4-HMAC-SHA256 Credential=MY_ACCESS_KEY/');
    expect(headers['x-amz-date']).toBeDefined();
    expect(headers['x-amz-content-sha256']).toBeDefined();
    expect(headers['User-Agent']).toBe('RadSuite/1.0 (PACS Workstation)');
  });

  it('merges overrides with storage config', () => {
    const creds = getEffectiveS3Credentials({
      s3Bucket: 'radiology',
      s3ForcePathStyle: true,
    });

    expect(creds.bucket).toBe('radiology');
    expect(creds.forcePathStyle).toBe(true);
  });
});
