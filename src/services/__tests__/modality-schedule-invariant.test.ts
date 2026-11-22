import { describe, it, expect } from 'vitest';
import { inferModality, resolveClinicalDescription, matchesModality } from '@/lib/modality-inference';

describe('Modality Separation & Schedule Invariant (Rule 14)', () => {
  describe('COD Emergency Scans Isolation', () => {
    it('strictly forces modality to CT for all COD patient names regardless of input modality', () => {
      // In hospital PACS, C-FIND Study root queries lack Modality and default to MR.
      // Any case with 'COD' (Call On Duty) in the patient name is exclusively emergency head CT.
      expect(inferModality('MR', 'MR Brain Plain', 'JHANGEER COD')).toBe('CT');
      expect(inferModality('MR', 'MR Study', 'SADAQE COD')).toBe('CT');
      expect(inferModality(null, 'STUDY', 'JAMEEL COD 31813')).toBe('CT');
      expect(inferModality('UNKNOWN', null, 'RABIA COD')).toBe('CT');
      expect(inferModality('MR', null, 'PATIENT COD')).toBe('CT');
    });

    it('resolves description to CT Brain Plain for COD patients', () => {
      expect(resolveClinicalDescription('MR Study', null, null, null, 'CT', 'JHANGEER COD')).toBe('CT Brain Plain');
      expect(resolveClinicalDescription('STUDY', null, null, null, 'CT', 'SADAQE COD')).toBe('CT Brain Plain');
      expect(resolveClinicalDescription(null, null, null, null, 'CT', 'BABLI BIBI COD')).toBe('CT Brain Plain');
    });
  });

  describe('Scanner Operating Schedule Integrity', () => {
    it('preserves genuine MRI scans and protocols during daytime operating hours', () => {
      // Standard daytime MRI scans (08:00 AM - 01:00 AM)
      expect(inferModality('MR', 'MRI Cervical Spine', 'SAMINA BANO', '082323')).toBe('MR');
      expect(inferModality('MR', 'MRI L/S Spine', 'USAMA ZULFIQAR', '083707')).toBe('MR');
      expect(inferModality('MR', 'MR PELVIS', 'AFTAB', '085234')).toBe('MR');
      expect(inferModality('MR', 'MR RT KNEE', 'NAYYAB', '091025')).toBe('MR');
      expect(inferModality('MR', 'MR Brain', 'ALTAF', '092631')).toBe('MR');
    });

    it('preserves MR modality regardless of scan hour with zero artificial schedule assumptions (Rule 14)', () => {
      // Rule 14: Pure Filter Independence: Modality filtering is governed strictly by
      // user-configured filters and DICOM metadata, with zero artificial daytime vs nighttime scanner schedule assumptions.
      expect(inferModality('MR', 'MR Study', 'ABDUL MAJEED', '014258.000')).toBe('MR');
      expect(inferModality('MR', 'MR Study', 'ABDUL MAJEED', '024421.000')).toBe('MR');
      expect(inferModality('MR', 'MR Study', 'M SULTAN', '024922.000')).toBe('MR');
      expect(inferModality('MR', 'MR Study', 'KASHIF', '031125.000')).toBe('MR');
      expect(inferModality('MR', 'MR Study', 'ZIALLAH', '040406.000')).toBe('MR');
    });

    it('preserves pelvic and knee MRIs without false CT classification', () => {
      expect(inferModality('MR', 'MR Study', 'PATIENT PELVIS')).toBe('MR');
      expect(inferModality('MR', 'MR Study', 'PATIENT RT KNEE')).toBe('MR');
      expect(inferModality('MR', 'MR Study', 'PATIENT LT KNEE')).toBe('MR');
    });

    it('strictly isolates CT from MR in modality matching filters', () => {
      expect(matchesModality('MR', 'MR')).toBe(true);
      expect(matchesModality('MRI', 'MR')).toBe(true);
      expect(matchesModality('CT', 'MR')).toBe(false);
      expect(matchesModality('MR', 'CT')).toBe(false);
    });
  });
});
