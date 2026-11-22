import { describe, it, expect } from 'vitest';
import {
  MASTER_CROSS_SECTIONAL_TEMPLATES,
  STANDARDIZED_CT_TEMPLATES,
  STANDARDIZED_MRI_TEMPLATES,
  getStandardizedTemplateById,
  searchStandardizedTemplates,
} from '../cross-sectional';

describe('Standardized Cross-Sectional CT & MRI Templates', () => {
  it('should load master standardized templates catalog with robust coverage', () => {
    expect(MASTER_CROSS_SECTIONAL_TEMPLATES.length).toBeGreaterThanOrEqual(25);
    expect(STANDARDIZED_CT_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    expect(STANDARDIZED_MRI_TEMPLATES.length).toBeGreaterThanOrEqual(15);
  });

  it('every template must possess non-empty technique, findings, and defaultImpression', () => {
    for (const t of MASTER_CROSS_SECTIONAL_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.technique.trim().length).toBeGreaterThan(15);
      expect(t.normalFindings.length).toBeGreaterThanOrEqual(3);
      expect(t.defaultImpression.trim().length).toBeGreaterThan(15);
    }
  });

  it('must be strictly purged of patient artifacts, typos, and false-positive pathology', () => {
    const serialized = JSON.stringify(MASTER_CROSS_SECTIONAL_TEMPLATES).toLowerCase();
    
    // Check against audited hazards
    expect(serialized).not.toContain('h/o fall');
    expect(serialized).not.toContain('sence');
    expect(serialized).not.toContain('tonsilar');
    expect(serialized).not.toContain('[x]');
    expect(serialized).not.toContain('straightening of cervical curve is noted');
    expect(serialized).not.toContain('with evidence of any lytic/sclerotic osseous deposit');
    expect(serialized).not.toContain('the size significant cervical lymphadenopathy is seen');
  });

  it('should allow precise lookup and multi-keyword search', () => {
    const brainCt = getStandardizedTemplateById('ct-brain-plain');
    expect(brainCt).toBeDefined();
    expect(brainCt?.modality).toBe('CT');
    expect(brainCt?.defaultImpression).toContain('No acute intracranial hemorrhage');

    const mriStroke = getStandardizedTemplateById('mri-brain-stroke');
    expect(mriStroke).toBeDefined();
    expect(mriStroke?.modality).toBe('MRI');
    expect(mriStroke?.technique).toContain('DWI');

    const kneeResults = searchStandardizedTemplates('menisci');
    expect(kneeResults.length).toBeGreaterThanOrEqual(1);
    expect(kneeResults[0].id).toBe('mri-knee');
  });
});
