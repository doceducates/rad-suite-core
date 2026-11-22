import { describe, it, expect } from 'vitest';
import { queryGoogleDriveStudies, downloadStudyFromGoogleDrive } from '../gdrive-case.service';
import { queryS3Studies, downloadStudyFromS3 } from '../s3-case.service';

describe('Google Drive and S3 Remote Storage Adapters', () => {
  it('handles Google Drive queries safely when offline or unconfigured', async () => {
    const studies = await queryGoogleDriveStudies({ modality: 'MRI' });
    expect(studies).toBeInstanceOf(Array);
  });

  it('handles Google Drive download safely when unconfigured', async () => {
    const res = await downloadStudyFromGoogleDrive('ACC-NONEXISTENT', 'C:\\temp\\nonexistent');
    expect(res.success).toBe(false);
    expect(res.filesDownloaded).toBe(0);
  });

  it('handles S3 queries safely when offline or unconfigured', async () => {
    const studies = await queryS3Studies({ modality: 'CT' });
    expect(studies).toBeInstanceOf(Array);
  });

  it('handles S3 download safely when unconfigured', async () => {
    const res = await downloadStudyFromS3('ACC-NONEXISTENT', 'C:\\temp\\nonexistent');
    expect(res.success).toBe(false);
    expect(res.filesDownloaded).toBe(0);
  });
});
