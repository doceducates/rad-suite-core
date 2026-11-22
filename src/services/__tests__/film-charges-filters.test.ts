import { describe, it, expect } from 'vitest';
import { isFilmChargesStudy, matchesFilmCharges } from '../unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

describe('Film Charges Filter Logic', () => {
  it('correctly detects various film charge descriptions', () => {
    expect(isFilmChargesStudy('FILM CHARGES')).toBe(true);
    expect(isFilmChargesStudy('MRI FILM CHARGES')).toBe(true);
    expect(isFilmChargesStudy('CT Film Charges Plain')).toBe(true);
    expect(isFilmChargesStudy('Printing Charge for CT')).toBe(true);
    expect(isFilmChargesStudy('Charges for Film')).toBe(true);
    expect(isFilmChargesStudy('CD Charge')).toBe(true);
    expect(isFilmChargesStudy(undefined, 'FILM CHARGE')).toBe(true);
  });

  it('correctly identifies diagnostic imaging exams as NOT film charges', () => {
    expect(isFilmChargesStudy('MRI Brain Plain')).toBe(false);
    expect(isFilmChargesStudy('CT Chest HRCT')).toBe(false);
    expect(isFilmChargesStudy('MRI Cervical Spine')).toBe(false);
    expect(isFilmChargesStudy('CR Chest PA')).toBe(false);
    expect(isFilmChargesStudy(undefined, undefined)).toBe(false);
  });

  it('matchesFilmCharges filters out film charges by default', () => {
    const diagnosticStudy = { isFilmCharges: false } as PacsStudyResult;
    const filmChargeStudy = { isFilmCharges: true } as PacsStudyResult;

    // Default behavior: hideFilmCharges is undefined or true
    expect(matchesFilmCharges(diagnosticStudy, undefined)).toBe(true);
    expect(matchesFilmCharges(filmChargeStudy, undefined)).toBe(false);
    expect(matchesFilmCharges(filmChargeStudy, true)).toBe(false);
  });

  it('matchesFilmCharges only includes film charges when user explicitly unchecks hideFilmCharges', () => {
    const filmChargeStudy = { isFilmCharges: true } as PacsStudyResult;

    // When user explicitly unchecks hideFilmCharges (toggled "Show Film Charges")
    expect(matchesFilmCharges(filmChargeStudy, false)).toBe(true);

    // Search query or default state must strictly respect hideFilmCharges
    expect(matchesFilmCharges(filmChargeStudy, true)).toBe(false);
  });

  it('excludes film charges from multi-study diagnostic grouping', () => {
    // Scenario 1: 1 Real Diagnostic Scan + 1 Film Charge
    const studiesCase1 = [
      {
        accessionNumber: 'ACC-001',
        patientMrn: 'MRN-100',
        studyDescription: 'MRI Brain Plain',
        isFilmCharges: false,
      } as PacsStudyResult,
      {
        accessionNumber: 'ACC-002',
        patientMrn: 'MRN-100',
        studyDescription: 'MRI Film Charges',
        isFilmCharges: true,
      } as PacsStudyResult,
    ];

    const diagStudies1 = studiesCase1.filter(
      (c) => !c.isFilmCharges && !isFilmChargesStudy(c.studyDescription)
    );
    // Film charge is discarded; only 1 diagnostic study remains -> NOT multi-study
    expect(diagStudies1.length).toBe(1);
    expect(diagStudies1.length > 1).toBe(false);

    // Scenario 2: 2 Real Diagnostic Scans + 1 Film Charge
    const studiesCase2 = [
      {
        accessionNumber: 'ACC-001',
        patientMrn: 'MRN-100',
        studyDescription: 'MRI Brain Plain',
        isFilmCharges: false,
      } as PacsStudyResult,
      {
        accessionNumber: 'ACC-002',
        patientMrn: 'MRN-100',
        studyDescription: 'MRI Cervical Spine',
        isFilmCharges: false,
      } as PacsStudyResult,
      {
        accessionNumber: 'ACC-003',
        patientMrn: 'MRN-100',
        studyDescription: 'CT Film Charges',
        isFilmCharges: true,
      } as PacsStudyResult,
    ];

    const diagStudies2 = studiesCase2.filter(
      (c) => !c.isFilmCharges && !isFilmChargesStudy(c.studyDescription)
    );
    expect(diagStudies2.length).toBe(2);
    // Companions for ACC-001 must only include ACC-002, never ACC-003
    const companionsFor001 = diagStudies2
      .filter((s) => s.accessionNumber !== 'ACC-001')
      .map((s) => s.accessionNumber);
    expect(companionsFor001).toEqual(['ACC-002']);
  });
});
