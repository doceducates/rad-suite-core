import { describe, it, expect, vi } from 'vitest';
import {
  matchesDate,
  matchesFilmCharges,
  matchesModality,
  matchesStatus,
  matchesPriority,
  matchesDepartment,
} from '../unified-case-filters';
import { buildHospitalPacsQueryConditions, getLast48HoursDicomRange } from '../hospital-pacs-query-filter';
import type { PacsStudyResult, PacsQueryFilter } from '@/types/pacs';

describe('Search Results Respect Filters Invariant', () => {
  const now = new Date();
  const formatIso = (offsetMs: number) => new Date(now.getTime() - offsetMs).toISOString();

  // Test timestamps relative to now
  const todayStudyIso = formatIso(2 * 60 * 60 * 1000); // 2 hours ago
  const yesterdayStudyIso = formatIso(20 * 60 * 60 * 1000); // 20 hours ago
  const fourDaysAgoIso = formatIso(4 * 24 * 60 * 60 * 1000); // 4 days ago
  const twentyDaysAgoIso = formatIso(20 * 24 * 60 * 60 * 1000); // 20 days ago
  const twoMonthsAgoIso = formatIso(60 * 24 * 60 * 60 * 1000); // 60 days ago

  describe('matchesDate with active search query', () => {
    it('strictly enforces 48h / shift date window even when searching', () => {
      const searchFilter: PacsQueryFilter = {
        query: 'Muhammad Ali',
        dateRange: '48h',
      };

      // Studies within 48h MUST match
      expect(matchesDate(todayStudyIso, searchFilter)).toBe(true);
      expect(matchesDate(yesterdayStudyIso, searchFilter)).toBe(true);

      // Studies older than 48h MUST NOT match, even with query present
      expect(matchesDate(fourDaysAgoIso, searchFilter)).toBe(false);
      expect(matchesDate(twentyDaysAgoIso, searchFilter)).toBe(false);
      expect(matchesDate(twoMonthsAgoIso, searchFilter)).toBe(false);
    });

    it('strictly enforces shift window for "shift" preset during search', () => {
      const shiftFilter: PacsQueryFilter = {
        query: '192608001234',
        dateRange: 'shift',
      };

      expect(matchesDate(todayStudyIso, shiftFilter)).toBe(true);
      expect(matchesDate(yesterdayStudyIso, shiftFilter)).toBe(true);
      expect(matchesDate(fourDaysAgoIso, shiftFilter)).toBe(false);
    });

    it('strictly enforces "today" preset during search', () => {
      const todayFilter: PacsQueryFilter = {
        patientName: 'Khadija',
        dateRange: 'today',
      };

      expect(matchesDate(todayStudyIso, todayFilter)).toBe(true);
      expect(matchesDate(fourDaysAgoIso, todayFilter)).toBe(false);
    });

    it('strictly enforces "yesterday" preset during search', () => {
      const yesterdayFilter: PacsQueryFilter = {
        accessionNumber: '192609001111',
        dateRange: 'yesterday',
      };

      expect(matchesDate(todayStudyIso, yesterdayFilter)).toBe(false);
      expect(matchesDate(fourDaysAgoIso, yesterdayFilter)).toBe(false);
    });

    it('strictly enforces "week" / "7d" preset during search', () => {
      const weekFilter: PacsQueryFilter = {
        query: 'Spine',
        dateRange: '7d',
      };

      expect(matchesDate(todayStudyIso, weekFilter)).toBe(true);
      expect(matchesDate(fourDaysAgoIso, weekFilter)).toBe(true);
      expect(matchesDate(twentyDaysAgoIso, weekFilter)).toBe(false);
      expect(matchesDate(twoMonthsAgoIso, weekFilter)).toBe(false);
    });

    it('strictly enforces "month" / "30d" preset during search', () => {
      const monthFilter: PacsQueryFilter = {
        patientMrn: '19202654321',
        dateRange: '30d',
      };

      expect(matchesDate(todayStudyIso, monthFilter)).toBe(true);
      expect(matchesDate(twentyDaysAgoIso, monthFilter)).toBe(true);
      expect(matchesDate(twoMonthsAgoIso, monthFilter)).toBe(false);
    });

    it('returns all historical matches only when dateRange is explicitly "all"', () => {
      const allFilter: PacsQueryFilter = {
        query: 'Muhammad Ali',
        dateRange: 'all',
      };

      expect(matchesDate(todayStudyIso, allFilter)).toBe(true);
      expect(matchesDate(yesterdayStudyIso, allFilter)).toBe(true);
      expect(matchesDate(fourDaysAgoIso, allFilter)).toBe(true);
      expect(matchesDate(twentyDaysAgoIso, allFilter)).toBe(true);
      expect(matchesDate(twoMonthsAgoIso, allFilter)).toBe(true);
    });

    it('strictly enforces custom date boundaries during search', () => {
      const customFilter: PacsQueryFilter = {
        query: 'Ali',
        dateRange: 'custom',
        dateFrom: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
        dateTo: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
      };

      // 4 days ago is within [now-10d, now-2d]
      expect(matchesDate(fourDaysAgoIso, customFilter)).toBe(true);

      // Today (2 hours ago) is outside the custom range
      expect(matchesDate(todayStudyIso, customFilter)).toBe(false);

      // 20 days ago is outside the custom range
      expect(matchesDate(twentyDaysAgoIso, customFilter)).toBe(false);
    });

    it('respects 48h filter in personal queue ("My Cases") based on claim/study date', () => {
      const myCasesFilter: PacsQueryFilter = {
        assignedTo: 'me',
        currentUserId: 'doc-123',
        query: 'Brain',
        dateRange: 'shift',
      };

      // Case taken up 5 hours ago (claimedAt)
      expect(matchesDate(fourDaysAgoIso, myCasesFilter, formatIso(5 * 3600 * 1000))).toBe(true);

      // Case taken up 5 days ago and study performed 5 days ago
      expect(matchesDate(fourDaysAgoIso, myCasesFilter, formatIso(5 * 86400000))).toBe(false);
    });
  });

  describe('Film charges filter during search', () => {
    const diagnosticStudy = { isFilmCharges: false } as PacsStudyResult;
    const filmChargeStudy = { isFilmCharges: true } as PacsStudyResult;

    it('hides film charges by default even when text search is active', () => {
      expect(matchesFilmCharges(diagnosticStudy, true)).toBe(true);
      expect(matchesFilmCharges(filmChargeStudy, true)).toBe(false);
      expect(matchesFilmCharges(filmChargeStudy, undefined)).toBe(false);
    });

    it('only shows film charges when hideFilmCharges is explicitly false', () => {
      expect(matchesFilmCharges(diagnosticStudy, false)).toBe(true);
      expect(matchesFilmCharges(filmChargeStudy, false)).toBe(true);
    });
  });

  describe('Hospital PACS SQL query conditions with active search', () => {
    it('always pushes 48h date constraint even when search is active', () => {
      const conditions = buildHospitalPacsQueryConditions({
        search: 'Fatima',
        searchField: 'name',
        datePreset: '48h',
      });

      // Both the 48h date constraint AND text search condition are pushed
      expect(conditions.length).toBeGreaterThanOrEqual(2);
    });

    it('pushes both modality and search condition simultaneously', () => {
      const conditions = buildHospitalPacsQueryConditions({
        search: '192608',
        modality: 'MR',
        datePreset: '48h',
      });

      // Modality, date, and search conditions all pushed
      expect(conditions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Simultaneous multi-filter adherence during search', () => {
    it('respects modality filter when searching', () => {
      expect(matchesModality('CT', 'MRI')).toBe(false);
      expect(matchesModality('MRI', 'MRI')).toBe(true);
      expect(matchesModality('MR', 'MRI')).toBe(true);
    });

    it('respects status filter when searching', () => {
      const draftStudy = { status: 'draft' } as PacsStudyResult;
      const finalStudy = { status: 'final' } as PacsStudyResult;

      expect(matchesStatus(draftStudy, 'draft')).toBe(true);
      expect(matchesStatus(finalStudy, 'draft')).toBe(false);
    });

    it('respects priority filter when searching', () => {
      const statStudy = { priority: 'stat' } as PacsStudyResult;
      const routineStudy = { priority: 'routine' } as PacsStudyResult;

      expect(matchesPriority(statStudy, 'stat')).toBe(true);
      expect(matchesPriority(routineStudy, 'stat')).toBe(false);
    });

    it('respects department filter when searching', () => {
      expect(matchesDepartment('Emergency Ward', 'er')).toBe(true);
      expect(matchesDepartment('Outpatient Clinic', 'er')).toBe(false);
    });
  });
});
