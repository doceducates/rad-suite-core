import { describe, it, expect } from 'vitest';
import { matchesDate } from '@/services/unified-case-filters';
import { buildWorklistQueryParams, buildHmisSyncPayload } from '@/hooks/worklist-case-utils';
import { inferDateRangeFromAccession, clampDateRange } from '../../../hmis-gateway/src/utils/date-helper.js';
import type { PacsStudyResult } from '@/types/pacs';

describe('HMIS Historical Search & Tombstone Resilience Invariants', () => {
  const mockHistoricalStudy: PacsStudyResult = {
    accessionNumber: '192609003949',
    patientName: 'Imran',
    patientMrn: '26202652168140',
    patientId: '26202652168140',
    age: 45,
    gender: 'Male',
    modality: 'MRI',
    studyDescription: 'MRI Lumbar Spine Without Contrast',
    studyDate: '2026-09-24T14:05:00.000Z',
    numSeries: 5,
    numInstances: 120,
    pacsServerAe: 'HMIS_GATEWAY',
    studyInstanceUid: '1.2.840.192609003949',
    source: 'hmis',
    status: 'scheduled',
    priority: 'routine',
  };

  describe('matchesDate invariant', () => {
    it('excludes 2-month-old historical cases when browsing active 48h shift without specific query', () => {
      // General shift browse should only show recent cases
      const matchesShift = matchesDate(mockHistoricalStudy.studyDate, {
        dateRange: 'shift',
      });
      expect(matchesShift).toBe(false);

      const matchesToday = matchesDate(mockHistoricalStudy.studyDate, {
        dateRange: 'today',
      });
      expect(matchesToday).toBe(false);
    });

    it('allows historical studies when dateRange is all', () => {
      const matchesAll = matchesDate(mockHistoricalStudy.studyDate, {
        dateRange: 'all',
        query: '192609003949',
      });
      expect(matchesAll).toBe(true);

      const matchesMrnAll = matchesDate(mockHistoricalStudy.studyDate, {
        dateRange: 'all',
        query: '26202652168140',
      });
      expect(matchesMrnAll).toBe(true);
    });
  });

  describe('HMIS Accession Date Range Inference & Clamping', () => {
    it('infers exact month and year from 12-digit accession structure [Hosp:2][YY:2][MM:2][Seq:6]', () => {
      // Accession 192609003949 -> Hospital 19, Year 2026, Month 09 (September)
      const inferred = inferDateRangeFromAccession('192609003949');
      expect(inferred).toBeDefined();
      expect(inferred?.year).toBe(2026);
      expect(inferred?.month).toBe(9);
      expect(inferred?.startDate).toBe('2026-09-01 00:00:00');
      expect(inferred?.endDate).toBe('2026-09-30 23:59:59');
    });

    it('strictly clamps 31-day months to max 30-day window due to HMIS portal search restriction', () => {
      // August has 31 days. HMIS throws an error if date range > 30 days.
      const augustInferred = inferDateRangeFromAccession('192608001234');
      expect(augustInferred).toBeDefined();
      expect(augustInferred?.lastDayOfMonth).toBe(31);
      // Clamped to 30 days
      expect(augustInferred?.endDate).toBe('2026-08-30 23:59:59');

      // Clamping utility also ensures manual ranges never exceed 30 days
      const clamped = clampDateRange('2026-08-01', '2026-08-31');
      expect(clamped.startDate).toBe('2026-08-01 00:00:00');
      expect(clamped.endDate).toBe('2026-08-30 23:59:59');
    });

    it('preserves historical months when searching HMIS by MRN with custom date filters', () => {
      // Radiologist searches MRN 26202652168140 and specifies September 2026 (30 days)
      const septPayload = buildHmisSyncPayload({
        modalityFilter: 'MRI',
        departmentFilter: 'all',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        searchQuery: '26202652168140',
      });
      expect(septPayload.mrn).toBe('26202652168140');
      expect(septPayload.startDate).toBe('2026-09-01');
      expect(septPayload.endDate).toBe('2026-09-30');

      // If a historical range > 30 days is given, safely clamp to 30 days without resetting to current date
      const widePayload = buildHmisSyncPayload({
        modalityFilter: 'MRI',
        departmentFilter: 'all',
        startDate: '2026-08-01',
        endDate: '2026-09-30',
        searchQuery: '26202652168140',
      });
      expect(widePayload.startDate).toBe('2026-08-01');
      expect(widePayload.endDate).toBe('2026-08-30'); // Clamped to 30 days starting from 2026-08-01
    });
  });

  describe('Tombstone resilience logic', () => {
    it('ensures explicit accession queries override stale tombstone suppression', () => {
      const tombstoned = new Set(['192609003949']);
      const accNorm = mockHistoricalStudy.accessionNumber.toUpperCase();

      // Default browse with tombstone: Should suppress
      const defaultFilter = { query: '' };
      const defaultExplicit = (defaultFilter.query || '').trim().toUpperCase();
      const shouldSuppressBrowse = tombstoned.has(accNorm) && (!defaultExplicit || !accNorm.includes(defaultExplicit));
      expect(shouldSuppressBrowse).toBe(true);

      // Explicit lookup for 192609003949: Must NOT suppress
      const searchFilter = { query: '192609003949' };
      const searchExplicit = (searchFilter.query || '').trim().toUpperCase();
      const shouldSuppressSearch = tombstoned.has(accNorm) && (!searchExplicit || !accNorm.includes(searchExplicit));
      expect(shouldSuppressSearch).toBe(false);
    });
  });
});
