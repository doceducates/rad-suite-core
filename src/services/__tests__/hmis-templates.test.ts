import { describe, it, expect } from 'vitest';
import { ALL_HMIS_TEMPLATES, searchHmisTemplates, getHmisTemplateById } from '../hmis-templates.data';
import { HMIS_CT_TEMPLATES } from '../hmis-templates-ct.data';
import { HMIS_MRI_TEMPLATES } from '../hmis-templates-mri.data';

describe('HMIS Radiology Reporting Templates', () => {
  it('should load all 27 Punjab HMIS templates', () => {
    expect(ALL_HMIS_TEMPLATES.length).toBe(27);
    expect(HMIS_CT_TEMPLATES.length).toBe(13);
    expect(HMIS_MRI_TEMPLATES.length).toBe(14);
  });

  it('should contain the authentic CT KUB Plain template matching hospital protocol', () => {
    const kub = getHmisTemplateById('ct-kub-plain');
    expect(kub).toBeDefined();
    expect(kub?.name).toContain('CT KUB without Contrast');
    expect(kub?.technique).toContain('Non-contrast CT KUB');
    expect(kub?.defaultImpression).toContain('No evidence of nephrolithiasis');
    expect(kub?.normalFindings.length).toBeGreaterThanOrEqual(4);
  });

  it('should filter templates by modality accurately', () => {
    const ctList = searchHmisTemplates('', 'CT');
    expect(ctList.length).toBe(13);
    expect(ctList.every((t) => t.modality === 'CT')).toBe(true);

    const mriList = searchHmisTemplates('', 'MRI');
    expect(mriList.length).toBe(14);
    expect(mriList.every((t) => t.modality === 'MRI')).toBe(true);
  });

  it('should perform text searches on names and clinical keywords', () => {
    const strokeResults = searchHmisTemplates('stroke');
    expect(strokeResults.length).toBeGreaterThanOrEqual(1);
    expect(strokeResults[0].id).toBe('mri-brain-stroke');

    const spineResults = searchHmisTemplates('lumbar');
    expect(spineResults.length).toBeGreaterThanOrEqual(2); // CT Lumbar and MRI Lumbar
  });
});
