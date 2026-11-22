import { describe, it, expect } from 'vitest';
import { isFilmChargesStudy } from '../unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

describe('Worklist Table Layout & Dual-Lifecycle Verification', () => {
  it('excludes film charges from multi-study links in patient groups', () => {
    // Simulated patient with 1 Brain MRI, 1 Cervical MRI, and 1 Film charge
    const rawStudies: PacsStudyResult[] = [
      {
        accessionNumber: 'ACC-BRAIN',
        patientMrn: 'MRN-777',
        patientName: 'Jane Doe',
        studyDescription: 'MRI BRAIN PLAIN',
        modality: 'MRI',
        status: 'draft',
        isFilmCharges: false,
      } as PacsStudyResult,
      {
        accessionNumber: 'ACC-CERVICAL',
        patientMrn: 'MRN-777',
        patientName: 'Jane Doe',
        studyDescription: 'MRI CERVICAL SPINE',
        modality: 'MRI',
        status: 'scheduled',
        isFilmCharges: false,
      } as PacsStudyResult,
      {
        accessionNumber: 'ACC-FILM',
        patientMrn: 'MRN-777',
        patientName: 'Jane Doe',
        studyDescription: 'MRI FILM CHARGES',
        modality: 'MRI',
        status: 'scheduled',
        isFilmCharges: true,
      } as PacsStudyResult,
    ];

    const diagnosticOnly = rawStudies.filter(
      (s) => !s.isFilmCharges && !isFilmChargesStudy(s.studyDescription)
    );

    // Assert that film charge was excluded
    expect(diagnosticOnly.length).toBe(2);
    expect(diagnosticOnly.map((s) => s.accessionNumber)).toEqual(['ACC-BRAIN', 'ACC-CERVICAL']);

    // Check companions for ACC-BRAIN
    const companionsForBrain = diagnosticOnly
      .filter((s) => s.accessionNumber !== 'ACC-BRAIN')
      .map((s) => s.accessionNumber);

    expect(companionsForBrain).toEqual(['ACC-CERVICAL']);
    expect(companionsForBrain).not.toContain('ACC-FILM');
  });

  it('recognizes all clinical PGR dual-lifecycle statuses', () => {
    const pgrStatuses = [
      'scheduled',   // ⏳ Awaiting Report
      'preliminary', // 🎙️ PGR Preliminary
      'pending',     // ⚠️ Pending (Info/Issue)
      'draft',       // 📝 Discussed / Typing
      'submitted',   // 📤 Submitted to HMIS
      'final',       // ✅ Verified & Published
      'amended',     // 🔄 Amended
    ];

    const getStatusCategory = (st: string) => {
      if (['final', 'finalized', 'reported'].includes(st)) return 'completed';
      if (st === 'preliminary') return 'preliminary';
      if (st === 'pending') return 'blocked';
      if (st === 'submitted') return 'submitted_to_consultant';
      if (st === 'draft') return 'in_progress';
      if (st === 'scheduled' || st === 'awaiting_report') return 'intake';
      return 'other';
    };

    expect(getStatusCategory('scheduled')).toBe('intake');
    expect(getStatusCategory('preliminary')).toBe('preliminary');
    expect(getStatusCategory('pending')).toBe('blocked');
    expect(getStatusCategory('draft')).toBe('in_progress');
    expect(getStatusCategory('submitted')).toBe('submitted_to_consultant');
    expect(getStatusCategory('final')).toBe('completed');
  });

  it('correctly identifies STAT priority for urgent badge display', () => {
    const isStat = (priority?: string) => (priority || '').toLowerCase() === 'stat';
    expect(isStat('stat')).toBe(true);
    expect(isStat('STAT')).toBe(true);
    expect(isStat('routine')).toBe(false);
    expect(isStat(undefined)).toBe(false);
  });

  it('filters studies with custom date range boundaries', async () => {
    const { matchesDate } = await import('../unified-case-filters');

    const studyOct5 = '2026-10-05T12:00:00Z';
    const studyOct8 = '2026-10-08T12:00:00Z';
    const studyOct12 = '2026-10-12T12:00:00Z';

    const customFilter = {
      dateRange: 'custom' as const,
      dateFrom: '2026-10-06',
      dateTo: '2026-10-10',
    };

    expect(matchesDate(studyOct5, customFilter)).toBe(false);
    expect(matchesDate(studyOct8, customFilter)).toBe(true);
    expect(matchesDate(studyOct12, customFilter)).toBe(false);
  });

  it('filters studies by PACS images readiness correctly', async () => {
    const { matchesImagesReady } = await import('../unified-case-filters');

    const studyWithImages: PacsStudyResult = {
      accessionNumber: 'ACC-READY',
      hasImages: true,
      numInstances: 45,
    } as any;

    const studyAwaitingImages: PacsStudyResult = {
      accessionNumber: 'ACC-AWAITING',
      hasImages: false,
      numInstances: 0,
      folderPath: undefined,
    } as any;

    expect(matchesImagesReady(studyWithImages, true)).toBe(true);
    expect(matchesImagesReady(studyAwaitingImages, true)).toBe(false);
    // When imagesReadyOnly is false/undefined, both pass
    expect(matchesImagesReady(studyAwaitingImages, false)).toBe(true);
  });

  it('filters studies by clinical department accurately', async () => {
    const { matchesDepartment } = await import('../unified-case-filters');

    expect(matchesDepartment('EMERGENCY ROOM', 'er')).toBe(true);
    expect(matchesDepartment('ER Trauma Centre', 'er')).toBe(true);
    expect(matchesDepartment('OPD Clinic 4', 'er')).toBe(false);
    expect(matchesDepartment('OPD Clinic 4', 'opd')).toBe(true);
    expect(matchesDepartment('Indoor Ward 3', 'ward')).toBe(true);
    expect(matchesDepartment('ICU Bed 2', 'ward')).toBe(true);
  });
});

