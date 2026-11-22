import { describe, it, expect } from 'vitest';
import { matchesDate, matchesModality, matchesFilmCharges } from '../unified-case-filters';
import { consolidatePatientStudies } from '../unified-case-grouping';
import type { PacsStudyResult } from '@/types/pacs';

describe('Multi-Study Consolidation & Specific Search Invariants', () => {
  const diagnosticStudy: PacsStudyResult = {
    accessionNumber: '192611005679',
    patientName: 'Tahreen Asghar',
    patientMrn: '19202656614367',
    patientId: '19202656614367',
    age: 41,
    gender: 'Male',
    modality: 'MRI',
    studyDescription: 'MRI Lumbosacral Spine Without Contrast',
    studyDate: '2026-11-13T09:26:00.000Z', // 3 days ago
    status: 'scheduled',
    hmisStatus: 'awaiting_report',
    isFilmCharges: false,
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'LOCAL',
    studyInstanceUid: '1.2.840.192611005679',
  };

  const filmChargesStudy: PacsStudyResult = {
    accessionNumber: '192611005678',
    patientName: 'Tahreen Asghar',
    patientMrn: '19202656614367',
    patientId: '19202656614367',
    age: 41,
    gender: 'Male',
    modality: 'MRI',
    studyDescription: 'MRI Film Charges',
    studyDate: '2026-11-16T12:10:00.000Z', // Today
    status: 'scheduled',
    hmisStatus: 'awaiting_report',
    isFilmCharges: true,
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'LOCAL',
    studyInstanceUid: '1.2.840.192611005678',
  };

  describe('Search & Date Range Invariants', () => {
    it('relative date filter strictly filters by active shift window as intended', () => {
      // Diagnostic study is from 3 days ago; shift filter strictly rejects it
      const inShift = matchesDate(diagnosticStudy.studyDate, { dateRange: 'shift', query: 'Tahreen' });
      expect(inShift).toBe(false);

      // But searching across all dates immediately accepts it
      const inAll = matchesDate(diagnosticStudy.studyDate, { dateRange: 'all', query: 'Tahreen' });
      expect(inAll).toBe(true);

      // Direct accession targeting parameter strictly respects active relative date filter
      const directAcc = matchesDate(diagnosticStudy.studyDate, {
        dateRange: 'shift',
        accessionNumber: '192611005679',
      });
      expect(directAcc).toBe(false);

      // Expanding to all dates allows immediate lookup
      const directAccAll = matchesDate(diagnosticStudy.studyDate, {
        dateRange: 'all',
        accessionNumber: '192611005679',
      });
      expect(directAccAll).toBe(true);
    });

    it('modality filter strictly filters by modality unless identifier is directly targeted', () => {
      expect(matchesModality('MRI', 'CT', false)).toBe(false);
      expect(matchesModality('MRI', 'CT', true)).toBe(true);
      expect(matchesModality('MRI', 'MRI', false)).toBe(true);
    });

    it('explicit search for film charges accession returns true even if hideFilmCharges is true', () => {
      // Standalone without search: hidden
      expect(matchesFilmCharges(filmChargesStudy, true, false)).toBe(false);

      // When user clicks "Bill" toggle (hideFilmCharges === false): visible
      expect(matchesFilmCharges(filmChargesStudy, false, false)).toBe(true);

      // When user specifically searched for this accession: visible
      expect(matchesFilmCharges(filmChargesStudy, true, true)).toBe(true);
    });
  });

  describe('Consolidation of Co-Ordered Patient Studies & Billing Isolation', () => {
    it('hides film charges by default when diagnostic scans exist, keeping table clean', () => {
      // Bills OFF by default (hideFilmCharges = true)
      const consolidated = consolidatePatientStudies([diagnosticStudy, filmChargesStudy], true);

      expect(consolidated.length).toBe(1);
      const patientRow = consolidated[0];

      // Primary row is the medical diagnostic scan
      expect(patientRow.accessionNumber).toBe('192611005679');
      expect(patientRow.studyDescription).toBe('MRI Lumbosacral Spine Without Contrast');

      // Film charge is hidden from studies list to prevent UI clutter
      expect(patientRow.studies?.length).toBe(1);
      expect(patientRow.studies?.[0].accessionNumber).toBe('192611005679');
      expect(patientRow.isMultiStudy).toBe(false);
    });

    it('shows film charges when user explicitly enables the Bills button', () => {
      // Bills ON (hideFilmCharges = false)
      const consolidated = consolidatePatientStudies([diagnosticStudy, filmChargesStudy], false);

      expect(consolidated.length).toBe(1);
      const patientRow = consolidated[0];

      // Both diagnostic scan and film charges are visible
      expect(patientRow.studies?.length).toBe(2);
      expect(patientRow.isMultiStudy).toBe(true);
      const accList = patientRow.studies?.map((s) => s.accessionNumber);
      expect(accList).toContain('192611005679');
      expect(accList).toContain('192611005678');
    });

    it('preserves film charges when patient has NO diagnostic scans (unacknowledged scenario)', () => {
      // Patient only has film charges in database (e.g. diagnostic scan not yet acknowledged on HMIS)
      const consolidated = consolidatePatientStudies([filmChargesStudy], true);

      expect(consolidated.length).toBe(1);
      expect(consolidated[0].accessionNumber).toBe('192611005678');
      expect(consolidated[0].isFilmCharges).toBe(true);
    });

    it('groups multiple diagnostic studies (e.g. Cervical and Lumbar) cleanly under one patient row', () => {
      const cervical: PacsStudyResult = {
        ...diagnosticStudy,
        accessionNumber: '192611004852',
        studyDescription: 'MRI Cervical Spine Without Contrast',
      };
      const lumbar: PacsStudyResult = {
        ...diagnosticStudy,
        accessionNumber: '192611004853',
        studyDescription: 'MRI Lumbar Spine Without Contrast',
      };

      const consolidated = consolidatePatientStudies([cervical, lumbar], true);
      expect(consolidated.length).toBe(1);
      expect(consolidated[0].isMultiStudy).toBe(true);
      expect(consolidated[0].studies?.length).toBe(2);
    });
  });
});
