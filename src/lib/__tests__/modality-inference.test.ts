import { describe, it, expect } from 'vitest';
import { inferModality, resolveClinicalDescription, matchesModality } from '../modality-inference';

describe('modality-inference', () => {
  describe('inferModality', () => {
    it('infers CT from description keywords even if modality was blank or MR', () => {
      expect(inferModality('MR', 'CT Study')).toBe('CT');
      expect(inferModality('MR', 'CT Brain Plain')).toBe('CT');
      expect(inferModality(null, 'HRCT Chest')).toBe('CT');
      expect(inferModality('UNKNOWN', 'CECT Abdomen')).toBe('CT');
    });

    it('infers CT from patient name clinical hints when description is generic', () => {
      expect(inferModality('MR', 'CT Study', 'ASMA SHEHZADI CT BRAIN 3D')).toBe('CT');
      expect(inferModality(null, 'STUDY', 'PATIENT COD')).toBe('CT');
      expect(inferModality(null, 'STUDY', 'PATIENT KUB NC')).toBe('CT');
    });

    it('infers CT for COD emergency scans unconditionally even if raw modality was MR', () => {
      expect(inferModality('MR', 'MR Brain Plain', 'JHANGEER COD')).toBe('CT');
      expect(inferModality('MR', 'MR Study', 'PATIENT COD')).toBe('CT');
      expect(inferModality('MR', 'STUDY', 'SADAQE COD 31810')).toBe('CT');
      expect(inferModality('MR', 'MR Study', 'M YOUSAF HRCT CHEST')).toBe('CT');
      expect(inferModality(null, null, 'SAKHAWAT COD')).toBe('CT');
    });

    it('infers MR from MRI descriptions and preserves MR modality', () => {
      expect(inferModality('CT', 'MRI L/S Spine')).toBe('MR');
      expect(inferModality(null, 'MR Brain C+')).toBe('MR');
      expect(inferModality('MR', 'MR Study')).toBe('MR');
      expect(inferModality('MR', 'Study', 'PATIENT LT KNEE')).toBe('MR');
      expect(inferModality('MR', 'Study', 'PATIENT PELVIS')).toBe('MR');
    });

    it('falls back to raw modality correctly', () => {
      expect(inferModality('MRI', 'Unknown Study')).toBe('MR');
      expect(inferModality('CT', 'Routine Scan')).toBe('CT');
      expect(inferModality('CR', 'Chest')).toBe('CR');
    });
  });

  describe('resolveClinicalDescription', () => {
    it('preserves genuine study descriptions and expands known abbreviations', () => {
      expect(resolveClinicalDescription('MRI L/S Spine', null, null, null, 'MR')).toBe('MRI L/S Spine');
      expect(resolveClinicalDescription('LS', null, null, null, 'MR')).toBe('MRI L/S Spine');
      expect(resolveClinicalDescription('CS', null, null, null, 'MR')).toBe('MRI Cervical Spine');
      expect(resolveClinicalDescription('CT Brain Plain', null, null, null, 'CT')).toBe('CT Brain Plain');
    });

    it('resolves generic descriptions using series description or protocol name', () => {
      expect(resolveClinicalDescription('CT Study', 'L/S Spine Sagittal', null, null, 'CT')).toBe('CT L/S Spine');
      expect(resolveClinicalDescription('MR Study', 'Brain T2 Axial', null, null, 'MR')).toBe('MR Brain');
      expect(resolveClinicalDescription('STUDY', null, 'C-Spine Protocol', null, 'MR')).toBe('MRI Cervical Spine');
    });

    it('resolves generic descriptions from patient name hints', () => {
      expect(resolveClinicalDescription('CT Study', null, null, null, 'CT', 'ASMA CT BRAIN 3D')).toBe('CT Brain 3D');
      expect(resolveClinicalDescription('CT Study', null, null, null, 'CT', 'ALI KUB NC')).toBe('CT KUB NC');
      expect(resolveClinicalDescription('CT Study', null, null, null, 'CT', 'PATIENT LT KNEE')).toBe('CT Left Knee');
    });
  });

  describe('matchesModality', () => {
    it('returns true when filter is all or empty', () => {
      expect(matchesModality('CT', 'all')).toBe(true);
      expect(matchesModality('MR', '')).toBe(true);
      expect(matchesModality('CR', undefined)).toBe(true);
    });

    it('matches MR and MRI interchangeably', () => {
      expect(matchesModality('MR', 'MRI')).toBe(true);
      expect(matchesModality('MRI', 'MR')).toBe(true);
      expect(matchesModality('MR', 'MR')).toBe(true);
      expect(matchesModality('MRI', 'MRI')).toBe(true);
    });

    it('strictly separates MRI from CT', () => {
      expect(matchesModality('CT', 'MRI')).toBe(false);
      expect(matchesModality('CT', 'MR')).toBe(false);
      expect(matchesModality('MR', 'CT')).toBe(false);
      expect(matchesModality('MRI', 'CT')).toBe(false);
    });

    it('matches CT filter strictly', () => {
      expect(matchesModality('CT', 'CT')).toBe(true);
      expect(matchesModality('CR', 'CT')).toBe(false);
    });

    it('matches X-ray / CR / XR / DX interchangeably', () => {
      expect(matchesModality('CR', 'XR')).toBe(true);
      expect(matchesModality('DX', 'CR')).toBe(true);
      expect(matchesModality('XR', 'X-RAY')).toBe(true);
    });
  });
});
