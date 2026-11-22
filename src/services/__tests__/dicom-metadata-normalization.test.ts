import { describe, it, expect } from 'vitest';
import { getStudyManifest } from '../study-manifest.service';
import * as s3Retrieval from '../s3-retrieval.service';
import { vi } from 'vitest';

describe('Task 3: DICOM Metadata Normalization & Space Preservation', () => {
  it('preserves clean spaces in patient name and extracts metadata', async () => {
    vi.spyOn(s3Retrieval, 'getS3StudySeries').mockResolvedValue([
      {
        seriesNumber: '1',
        seriesDescription: 'AXIAL T2',
        orientation: 'AXIAL',
        sliceCount: 25,
        keys: [
          'dicom/2026/10/MR/192610002587_M_YAQOOB_1.2.392.200036.9116.4.2.9652.1467/series-1_AXIAL/0001.dcm',
        ],
      },
    ]);

    const manifest = await getStudyManifest('192610002587', { modality: 'MR' });
    expect(manifest).not.toBeNull();
    expect(manifest?.accessionNumber).toBe('192610002587');
    expect(manifest?.modality).toBe('MR');
    // Verify space between M and YAQOOB is preserved rather than underscore or mashed together
    expect(manifest?.patientName).toBe('M YAQOOB');
    expect(manifest?.series).toHaveLength(1);
    expect(manifest?.series[0].orientation).toBe('AXIAL');
  });
});
