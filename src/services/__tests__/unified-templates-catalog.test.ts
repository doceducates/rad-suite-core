import { describe, it, expect } from 'vitest';
import {
  MASTER_TEMPLATE_CATALOG,
  CT_TEMPLATES,
  MRI_TEMPLATES,
  getTemplateById,
  getTemplatesByModality,
  findTemplateForStudy,
} from '../template-manager.service';
import { WORKLIST_TEMPLATES, findBestTemplateForStudy } from '@/components/worklist/worklist-templates';
import { findingsListToHtml } from '@/lib/clinical-format';

describe('Unified Single Source of Truth Template Service (Option B)', () => {
  it('should load all modular templates into the unified catalog', () => {
    expect(CT_TEMPLATES.length).toBe(24);
    expect(MRI_TEMPLATES.length).toBe(43);
    expect(MASTER_TEMPLATE_CATALOG.length).toBe(67);
  });

  it('all templates must strictly adhere to Option B clean clinical paragraphs without unparsed placeholders', () => {
    for (const tpl of MASTER_TEMPLATE_CATALOG) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.technique.trim().length).toBeGreaterThan(15);
      expect(tpl.normalFindings.length).toBeGreaterThanOrEqual(2);
      expect(tpl.defaultImpression.trim().length).toBeGreaterThan(15);

      for (const p of tpl.normalFindings) {
        expect(p).not.toContain('[X]');
        expect(p).not.toContain('[x]');
        expect(p).not.toContain('___');
      }
    }
  });

  it('should resolve historical aliases and bidirectional mappings', () => {
    expect(getTemplateById('ct-hrct-thorax')?.id).toBe('ct-hrct-chest');
    expect(getTemplateById('ct-pulmonary-angio')?.id).toBe('ct-pulmonary-angiogram');
    expect(getTemplateById('mri-dorsal-spine')?.id).toBe('mri-thoracic-spine');
    expect(getTemplateById('mri-knee-joint')?.id).toBe('mri-knee');
    expect(getTemplateById('mrcp')?.id).toBe('mrcp');
    expect(getTemplateById('mri-ankle')?.id).toBe('mri-ankle-foot');
  });

  it('should find optimal templates from PACS and HMIS study descriptions', () => {
    // CT Matches
    const ctBrain = findTemplateForStudy('CT', 'CT Brain Plain / COD Trauma');
    expect(ctBrain?.id).toBe('ct-brain-plain');

    const ctChest = findTemplateForStudy('CT', 'CT Chest (CECT)');
    expect(ctChest?.id).toBe('ct-chest-cect');

    const hrct = findTemplateForStudy('CT', 'HRCT Thorax (High Res)');
    expect(hrct?.id).toBe('ct-hrct-chest');

    const ctKub = findTemplateForStudy('CT', 'CT KUB for stone search');
    expect(ctKub?.id).toBe('ct-kub-plain');

    const ctSpine = findTemplateForStudy('CT', 'CT L-Spine (Lumbar)');
    expect(ctSpine?.id).toBe('ct-lumbar-spine');

    // MRI Matches
    const mriBrainPlain = findTemplateForStudy('MRI', 'MRI Brain Routine (Plain)');
    expect(mriBrainPlain?.id).toBe('mri-brain-plain');

    const mriBrainContrast = findTemplateForStudy('MRI', 'MRI Brain Routine with Contrast');
    expect(mriBrainContrast?.id).toBe('mri-brain-contrast');

    const mriStroke = findTemplateForStudy('MRI', 'MRI Brain Stroke Protocol (DWI)');
    expect(mriStroke?.id).toBe('mri-brain-stroke');

    const mriCSpine = findTemplateForStudy('MRI', 'MRI Cervical Spine Plain');
    expect(mriCSpine?.id).toBe('mri-cervical-spine');

    const mriCSpineContrast = findTemplateForStudy('MRI', 'CEMRI Cervical Spine with Contrast');
    expect(mriCSpineContrast?.id).toBe('mri-cervical-spine-contrast');

    const mriTSpine = findTemplateForStudy('MRI', 'MRI Thoracic / Dorsal Spine');
    expect(mriTSpine?.id).toBe('mri-thoracic-spine');

    const mriLSpine = findTemplateForStudy('MRI', 'MRI Lumbosacral Spine Plain');
    expect(mriLSpine?.id).toBe('mri-lumbar-spine');

    const mriLSpineContrast = findTemplateForStudy('MRI', 'MRI Lumbar Spine + Contrast');
    expect(mriLSpineContrast?.id).toBe('mri-lumbar-spine-contrast');

    const mriWholeSpine = findTemplateForStudy('MRI', 'MRI Whole Spine Screening');
    expect(mriWholeSpine?.id).toBe('mri-whole-spine');

    const mrcp = findTemplateForStudy('MRI', 'MRCP Biliary Tree Protocol');
    expect(mrcp?.id).toBe('mrcp');

    const mriKnee = findTemplateForStudy('MRI', 'MRI Knee Joint Right');
    expect(mriKnee?.id).toBe('mri-knee');

    const mriShoulder = findTemplateForStudy('MRI', 'MRI Shoulder Joint Left');
    expect(mriShoulder?.id).toBe('mri-shoulder');
  });

  it('worklist-templates bridge should serve all catalog templates and provide fast lookup', () => {
    expect(Object.keys(WORKLIST_TEMPLATES).length).toBeGreaterThanOrEqual(57);

    const match = findBestTemplateForStudy('CT', 'CT Head Trauma');
    expect(match).not.toBeNull();
    expect(match?.template.findings).toContain('preserved gray-white matter differentiation');
    expect(match?.template.impression).toContain('No acute intracranial hemorrhage');
  });

  it('clinically isolates contrast-enhanced from non-contrast templates without false claims', () => {
    const plainCT = getTemplateById('ct-brain-plain')!;
    expect(plainCT).toBeDefined();
    const plainCTFindings = plainCT.normalFindings.join(' ').toLowerCase();
    expect(plainCTFindings).not.toContain('post-contrast');
    expect(plainCTFindings).not.toContain('enhancement');

    const cect = getTemplateById('ct-brain-cect')!;
    expect(cect).toBeDefined();
    const cectFindings = cect.normalFindings.join(' ').toLowerCase();
    expect(cectFindings).toContain('enhancement');

    const plainMRI = getTemplateById('mri-brain-plain')!;
    expect(plainMRI).toBeDefined();
    const plainMRIFindings = plainMRI.normalFindings.join(' ').toLowerCase();
    expect(plainMRIFindings).not.toContain('post-contrast');
    expect(plainMRIFindings).not.toContain('enhancement');

    const cemri = getTemplateById('mri-brain-contrast')!;
    expect(cemri).toBeDefined();
    const cemriFindings = cemri.normalFindings.join(' ').toLowerCase();
    expect(cemriFindings).toContain('post-contrast');
    expect(cemriFindings).toContain('enhancement');
  });

  it('differentiates contrast studies accurately across varied clinical nomenclature', () => {
    // Non-contrast / plain queries
    expect(findTemplateForStudy('CT', 'CT BRAIN PLAIN')?.id).toBe('ct-brain-plain');
    expect(findTemplateForStudy('CT', 'NCCT HEAD TRAUMA')?.id).toBe('ct-brain-plain');
    expect(findTemplateForStudy('CT', 'CT BRAIN W/O CONTRAST')?.id).toBe('ct-brain-plain');
    expect(findTemplateForStudy('CT', 'CT CHEST NON-CONTRAST')?.id).toBe('ct-hrct-chest');
    expect(findTemplateForStudy('MRI', 'MRI BRAIN WITHOUT CONTRAST')?.id).toBe('mri-brain-plain');

    // Contrast queries
    expect(findTemplateForStudy('CT', 'CECT BRAIN')?.id).toBe('ct-brain-cect');
    expect(findTemplateForStudy('CT', 'CT BRAIN WITH CONTRAST')?.id).toBe('ct-brain-cect');
    expect(findTemplateForStudy('CT', 'CT CHEST + CONTRAST')?.id).toBe('ct-chest-cect');
    expect(findTemplateForStudy('MRI', 'CEMRI BRAIN')?.id).toBe('mri-brain-contrast');
    expect(findTemplateForStudy('MRI', 'MRI BRAIN WITH GADOLINIUM')?.id).toBe('mri-brain-contrast');
    expect(findTemplateForStudy('MRI', 'MRI CERVICAL SPINE + C')?.id).toBe('mri-cervical-spine-contrast');
  });

  it('all 61 templates have standard bold anatomical subheadings rendered by findingsListToHtml', () => {
    for (const tpl of MASTER_TEMPLATE_CATALOG) {
      const html = findingsListToHtml(tpl.normalFindings);
      // Ensure that 100% of paragraphs in each template have a <strong>Subheading:</strong>
      const strongCount = (html.match(/<strong>[^<]+:<\/strong>/g) || []).length;
      expect(strongCount).toBe(tpl.normalFindings.length);
    }

    // Specific check for CT KUB
    const kub = getTemplateById('ct-kub-plain')!;
    expect(kub).toBeDefined();
    const kubHtml = findingsListToHtml(kub.normalFindings);
    expect(kubHtml).toContain('<strong>Kidneys:</strong>');
    expect(kubHtml).toContain('<strong>Ureters:</strong>');
    expect(kubHtml).toContain('<strong>Urinary Bladder:</strong>');
  });
});
