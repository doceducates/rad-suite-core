import { describe, it, expect } from 'vitest';
import { matchesStudyDate, buildUnifiedCatalog } from '@/components/clinic-node/clinic-catalog-builder';

describe('Clinic Catalog Builder & Date Matching', () => {
  it('correctly matches "all" preset regardless of study date', () => {
    expect(matchesStudyDate('2026-11-09', 'all')).toBe(true);
    expect(matchesStudyDate('20261101', 'all')).toBe(true);
    expect(matchesStudyDate(undefined, 'all')).toBe(true);
  });

  it('correctly matches custom date ranges including DICOM YYYYMMDD format', () => {
    // 2026-11-05 is within 2026-11-01 -> 2026-11-07
    expect(matchesStudyDate('2026-11-05', 'custom', '2026-11-01', '2026-11-07')).toBe(true);
    expect(matchesStudyDate('20261105', 'custom', '2026-11-01', '2026-11-07')).toBe(true);

    // 2026-11-10 is outside 2026-11-01 -> 2026-11-07
    expect(matchesStudyDate('2026-11-10', 'custom', '2026-11-01', '2026-11-07')).toBe(false);
    expect(matchesStudyDate('20261110', 'custom', '2026-11-01', '2026-11-07')).toBe(false);
  });

  it('correctly matches today and 48h presets', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(matchesStudyDate(today, 'today')).toBe(true);
    expect(matchesStudyDate(today, '48h')).toBe(true);

    const oldDate = '2020-01-01';
    expect(matchesStudyDate(oldDate, 'today')).toBe(false);
    expect(matchesStudyDate(oldDate, '48h')).toBe(false);
  });

  it('merges local studies and synced studies with distinct locations and s3Status', () => {
    const catalog = buildUnifiedCatalog(
      [
        {
          studyId: 'ls_1',
          accession: 'ACC100',
          patientName: 'John Doe',
          isSyncedToS3: false,
          sizeMb: 45,
        } as any,
      ],
      [
        {
          id: 'ss_1',
          accession: 'ACC200',
          patientName: 'Jane Smith',
        } as any,
      ]
    );

    expect(catalog).toHaveLength(2);
    const acc100 = catalog.find((c) => c.accessionNumber === 'ACC100');
    expect(acc100?.location).toBe('sandbox');
    expect(acc100?.s3Status).toBe('local_only');

    const acc200 = catalog.find((c) => c.accessionNumber === 'ACC200');
    expect(acc200?.location).toBe('s3');
    expect(acc200?.s3Status).toBe('synced');
  });
});
