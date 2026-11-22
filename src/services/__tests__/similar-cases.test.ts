import { describe, it, expect } from 'vitest';
import {
  RADIOPAEDIA_CASES,
  getSimilarCasesByModalityAndBodyPart,
  searchSimilarCases,
} from '../similar-cases.service';

describe('Radiopaedia Similar Cases Service', () => {
  it('should have curated cases with complete clinical metadata', () => {
    expect(RADIOPAEDIA_CASES.length).toBeGreaterThanOrEqual(5);
    for (const c of RADIOPAEDIA_CASES) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.radiopaediaUrl).toContain('radiopaedia.org');
      expect(c.keyFindings.length).toBeGreaterThan(0);
      expect(c.diagnosticPearls).toBeTruthy();
      expect(c.differentialDiagnoses.length).toBeGreaterThan(0);
    }
  });

  it('should filter cases by modality correctly', () => {
    const ctCases = getSimilarCasesByModalityAndBodyPart('CT');
    expect(ctCases.every((c) => c.modality === 'CT')).toBe(true);

    const mriCases = getSimilarCasesByModalityAndBodyPart('MRI');
    expect(mriCases.every((c) => c.modality === 'MRI')).toBe(true);
  });

  it('should filter cases by body part', () => {
    const brainCases = getSimilarCasesByModalityAndBodyPart(undefined, 'Brain');
    expect(brainCases.length).toBeGreaterThan(0);
    expect(brainCases.every((c) => c.bodyPart === 'Brain')).toBe(true);
  });

  it('should search cases by pathology query across title, findings, and pearls', () => {
    const strokeResults = searchSimilarCases('infarct');
    expect(strokeResults.length).toBeGreaterThanOrEqual(1);
    expect(strokeResults[0].title).toContain('Infarct');

    const discResults = searchSimilarCases('extrusion');
    expect(discResults.length).toBeGreaterThanOrEqual(1);
    expect(discResults[0].title).toContain('Extruded');

    const peResults = searchSimilarCases('embolus');
    expect(peResults.length).toBeGreaterThanOrEqual(1);
  });
});
