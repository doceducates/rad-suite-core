// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSavedWorklistFilters,
  saveWorklistFilters,
  clearSavedWorklistFilters,
  loadSavedMyCasesFilters,
  saveMyCasesFilters,
  clearSavedMyCasesFilters,
  loadSavedPacsFilters,
  savePacsFilters,
  clearSavedPacsFilters,
  loadSavedPacsQueryFilters,
  savePacsQueryFilters,
  clearSavedPacsQueryFilters,
  loadSavedPatientRecordsFilters,
  savePatientRecordsFilters,
  clearSavedPatientRecordsFilters,
} from '@/lib/table-filter-storage';

describe('Table Filter State Persistence & HIPAA PHI Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Hospital Worklist Filters', () => {
    it('persists and restores clinical filters accurately', () => {
      saveWorklistFilters({
        modalityFilter: 'CT',
        departmentFilter: 'er',
        statusFilter: 'draft',
        priorityFilter: 'stat',
        pageSize: 50,
        sortField: 'date',
        sortDirection: 'desc',
        advancedFilters: {
          dateRange: 'today',
          bodyPart: 'neuro',
          criticalOnly: true,
        },
      });

      const restored = loadSavedWorklistFilters();
      expect(restored).not.toBeNull();
      expect(restored?.modalityFilter).toBe('CT');
      expect(restored?.departmentFilter).toBe('er');
      expect(restored?.statusFilter).toBe('draft');
      expect(restored?.priorityFilter).toBe('stat');
      expect(restored?.pageSize).toBe(50);
      expect(restored?.advancedFilters?.dateRange).toBe('today');
      expect(restored?.advancedFilters?.bodyPart).toBe('neuro');
      expect(restored?.advancedFilters?.criticalOnly).toBe(true);
    });

    it('STRICT INVARIANT: never persists or restores search query, MRN, or accession numbers', () => {
      // Intentionally attempt to inject patient identifiers and free-text searches
      const maliciousPayload: any = {
        modalityFilter: 'MRI',
        searchQuery: 'ACC-12345',
        search: 'Muhammad Ali',
        mrn: 'MRN-998877',
        patientName: 'John Doe',
        accessionNumber: 'ACC-12345',
      };

      saveWorklistFilters(maliciousPayload);

      const restored: any = loadSavedWorklistFilters();
      expect(restored.modalityFilter).toBe('MRI');
      expect(restored.searchQuery).toBeUndefined();
      expect(restored.search).toBeUndefined();
      expect(restored.mrn).toBeUndefined();
      expect(restored.patientName).toBeUndefined();
      expect(restored.accessionNumber).toBeUndefined();
    });

    it('clears saved worklist filters on reset', () => {
      saveWorklistFilters({ modalityFilter: 'CR', statusFilter: 'final' });
      expect(loadSavedWorklistFilters()).not.toBeNull();

      clearSavedWorklistFilters();
      expect(loadSavedWorklistFilters()).toBeNull();
    });
  });

  describe('My Cases Filters', () => {
    it('saves and restores My Cases clinical filters', () => {
      saveMyCasesFilters({
        modality: 'MRI',
        status: 'draft',
        priority: 'stat',
        department: 'opd',
        dateRange: 'shift',
        imagesReadyOnly: true,
        showFilmCharges: false,
      });

      const restored = loadSavedMyCasesFilters();
      expect(restored?.modality).toBe('MRI');
      expect(restored?.status).toBe('draft');
      expect(restored?.priority).toBe('stat');
      expect(restored?.department).toBe('opd');
      expect(restored?.dateRange).toBe('shift');
      expect(restored?.imagesReadyOnly).toBe(true);
      expect(restored?.showFilmCharges).toBe(false);
    });

    it('clears My Cases filters on reset', () => {
      saveMyCasesFilters({ modality: 'US' });
      clearSavedMyCasesFilters();
      expect(loadSavedMyCasesFilters()).toBeNull();
    });
  });

  describe('Hospital PACS Workstation Filters', () => {
    it('saves and restores PACS workstation filters', () => {
      savePacsFilters({
        modality: 'MR',
        datePreset: 'today',
        location: 'hospital_pacs',
        searchField: 'all',
      });

      const restored = loadSavedPacsFilters();
      expect(restored?.modality).toBe('MR');
      expect(restored?.datePreset).toBe('today');
      expect(restored?.location).toBe('hospital_pacs');
      expect(restored?.searchField).toBe('all');
    });

    it('STRICT INVARIANT: excludes free search text from PACS storage', () => {
      const payload: any = {
        modality: 'CT',
        datePreset: '48h',
        search: '192608002440',
      };

      savePacsFilters(payload);
      const restored: any = loadSavedPacsFilters();
      expect(restored.modality).toBe('CT');
      expect(restored.datePreset).toBe('48h');
      expect(restored.search).toBeUndefined();
    });

    it('clears PACS workstation filters on reset', () => {
      savePacsFilters({ modality: 'CT' });
      clearSavedPacsFilters();
      expect(loadSavedPacsFilters()).toBeNull();
    });
  });

  describe('Corrupted Storage & Edge Case Protection', () => {
    it('returns null and does not throw when localStorage contains malformed JSON', () => {
      localStorage.setItem('radsuite_filter_worklist_v1', '{invalid_json');
      expect(() => loadSavedWorklistFilters()).not.toThrow();
      expect(loadSavedWorklistFilters()).toBeNull();
    });

    it('handles empty string or null storage entries gracefully', () => {
      localStorage.setItem('radsuite_filter_my_cases_v1', '');
      expect(loadSavedMyCasesFilters()).toBeNull();
    });
  });
});
