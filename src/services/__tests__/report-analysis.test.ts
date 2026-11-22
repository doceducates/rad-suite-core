import { describe, it, expect } from 'vitest';
import {
  checkLateralityDiscrepancies,
  checkClinicalContradictions,
  checkGenderOrganSafety,
  generateShadowDifferentials,
  analyzeReport,
} from '../report-analysis.service';

describe('Report Discrepancy & Quality Analysis Service', () => {
  it('detects laterality conflicts between findings and impression', () => {
    const findings = 'Acute ischemic infarct identified in the right cerebellar hemisphere with edema.';
    const impression = 'Left cerebellar hemisphere acute infarction.';
    const discrepancies = checkLateralityDiscrepancies(findings, impression);

    expect(discrepancies.length).toBeGreaterThan(0);
    expect(discrepancies[0].lateralityConflict).toBe(true);
    expect(discrepancies[0].description).toContain('Laterality Mismatch');
  });

  it('detects laterality conflict with anatomical synonyms (kidney vs nephrolithiasis)', () => {
    const findings = 'Calculus noted in the right kidney with mild hydronephrosis.';
    const impression = 'Left nephrolithiasis with obstruction.';
    const discrepancies = checkLateralityDiscrepancies(findings, impression);

    expect(discrepancies.length).toBeGreaterThan(0);
    expect(discrepancies[0].lateralityConflict).toBe(true);
    expect(discrepancies[0].description).toContain('renal / kidney');
  });

  it('detects clinical contradiction between clear lungs and consolidation', () => {
    const findings = 'Lungs are clear bilaterally without effusion.';
    const impression = 'Right lower lobe patchy consolidation consistent with pneumonia.';
    const contradictions = checkClinicalContradictions(findings, impression);

    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions[0].description).toContain('Contradiction');
  });

  it('detects clinical contradiction between no hemorrhage and hematoma', () => {
    const findings = 'No acute intracranial hemorrhage or mass effect.';
    const impression = 'Subacute subdural hematoma along the right convexity.';
    const contradictions = checkClinicalContradictions(findings, impression);

    expect(contradictions.length).toBeGreaterThan(0);
  });

  it('detects gender safety mismatch when male report retains uterus/ovaries', () => {
    const maleReport = 'Normal liver and spleen. Normal anteverted uterus and bilateral ovaries without adnexal mass.';
    const alerts = checkGenderOrganSafety(maleReport, 'M');

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe('CRITICAL');
    expect(alerts[0].description).toContain('MALE');
    expect(alerts[0].description).toContain('uterus');
  });

  it('detects gender safety mismatch when female report retains prostate', () => {
    const femaleReport = 'Urinary bladder is normal. Normal size and parenchymal signal of prostate.';
    const alerts = checkGenderOrganSafety(femaleReport, 'Female');

    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe('CRITICAL');
    expect(alerts[0].description).toContain('FEMALE');
    expect(alerts[0].description).toContain('prostate');
  });

  it('passes gender safety check when anatomy matches gender', () => {
    const maleReport = 'Normal urinary bladder and unremarkable prostate gland.';
    const alerts = checkGenderOrganSafety(maleReport, 'M');
    expect(alerts.length).toBe(0);
  });

  it('generates modality-specific shadow differentials for CT and MRI', () => {
    const ctText = 'Subtle hypoattenuation with loss of insular ribbon definition.';
    const ctShadows = generateShadowDifferentials(ctText, 'CT');
    expect(ctShadows.some((s) => s.includes('ASPECTS') || s.includes('ischemic'))).toBe(true);

    const mriText = 'Focal diffusion restriction on DWI sequence.';
    const mriShadows = generateShadowDifferentials(mriText, 'MRI');
    expect(mriShadows.some((s) => s.includes('ADC map') || s.includes('infarct'))).toBe(true);
  });

  it('runs unified analyzeReport with gender check', () => {
    const findings = 'Right MCA territorial acute infarct. Normal uterus.';
    const impression = 'Left MCA territorial infarction.';
    const result = analyzeReport(findings, impression, 'CT', 'M');

    expect(result.discrepancies.length).toBe(2);
    expect(result.discrepancies.some((d) => d.severity === 'CRITICAL')).toBe(true);
    expect(result.discrepancies.some((d) => d.lateralityConflict)).toBe(true);
    expect(result.shadowDifferentials.length).toBeGreaterThan(0);
  });
});
