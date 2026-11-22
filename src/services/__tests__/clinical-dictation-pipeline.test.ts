import { describe, it, expect } from 'vitest';
import {
  cleanSpokenPunctuation,
  extractClinicalSections,
  formatClinicalFindingsHtml,
  normalizeImpressionList,
} from '../clinical-dictation-formatter';
import { processVoiceDictation } from '../ai-dictation-pipeline.service';
import { getAISettings, saveAISettings, DEFAULT_STRUCTURING_PROMPT } from '../ai-settings.service';
import {
  inferRegionFromStudy,
  getEffectiveRegionPrompt,
  CLINICAL_REGION_CATALOG,
} from '../region-prompts.service';

describe('Clinical Dictation Formatter & Parser', () => {
  it('cleans spoken punctuation words and normalizes spacing', () => {
    const raw = 'liver normal period gallbladder calculus colon 2 by 3 cm comma no obstruction period';
    const cleaned = cleanSpokenPunctuation(raw);
    expect(cleaned).toContain('.');
    expect(cleaned).toContain(':');
    expect(cleaned).toContain(',');
    expect(cleaned).toContain('2 x 3 cm');
  });

  it('extracts clinical history, findings, and impression from spoken transcript', () => {
    const raw =
      'There is history of lower back pain for one month. MRI findings are straightening of lumbar spine. At L4-L5 there is disc bulge. Impression: L4-L5 lumbar disc bulge with nerve root abutment.';
    const sections = extractClinicalSections(raw);

    expect(sections.clinicalHistory).toContain('lower back pain for one month');
    expect(sections.findings).toContain('straightening of lumbar spine');
    expect(sections.impression).toContain('L4-L5 lumbar disc bulge with nerve root abutment');
  });

  it('formats findings into distinct HTML paragraphs with strong tags', () => {
    const findings =
      'Spine alignment: straightening of lumbar lordosis. Intervertebral discs: diffuse bulge at L4-L5. Thecal sac: normal.';
    const html = formatClinicalFindingsHtml(findings, 'MRI');

    expect(html).toContain('<p><strong>Spine alignment:</strong>');
    expect(html).toContain('<p><strong>Intervertebral discs:</strong>');
    expect(html).toContain('<p><strong>Thecal sac:</strong>');
  });

  it('normalizes impression into clean numbered list', () => {
    const rawImp = 'Cholelithiasis with acute cholecystitis. Mild right hydronephrosis.';
    const numbered = normalizeImpressionList(rawImp);
    expect(numbered).toContain('1.');
    expect(numbered).toContain('2.');
  });

  it('infers correct anatomical region from study description', () => {
    expect(inferRegionFromStudy({ studyDescription: 'MRI Lumbar Spine (Disc / Radiculopathy)' })).toBe('spine_ls');
    expect(inferRegionFromStudy({ studyDescription: 'MRI Cervical Spine Without Contrast' })).toBe('spine_cervical');
    expect(inferRegionFromStudy({ studyDescription: 'MRI Dorsal Spine' })).toBe('spine_dorsal');
    expect(inferRegionFromStudy({ studyDescription: 'CT Brain Plain' })).toBe('brain');
    expect(inferRegionFromStudy({ studyDescription: 'HRCT Chest Volumetric' })).toBe('chest');
    expect(inferRegionFromStudy({ studyDescription: 'CT Abdomen and Pelvis' })).toBe('abdomen');
  });

  it('retrieves effective region prompt with custom override support', () => {
    const defaultLs = getEffectiveRegionPrompt('spine_ls');
    expect(defaultLs).toContain('MRI Lumbosacral (LS) Spine');

    const customOverrides = { spine_ls: 'My custom LS Spine template' };
    const effectiveCustom = getEffectiveRegionPrompt('spine_ls', customOverrides);
    expect(effectiveCustom).toBe('My custom LS Spine template');
  });

  it('processes complex case transcript with region-aware structuring', async () => {
    const transcript =
      'There is history of sudden onset and sharp lower back pain radiating to both legs for one month. No history of trauma, injury or weight lifting. No other comorbidities, no fever. MRI findings are straightening of lumbar sacral spine. At L4-L5 there is diffused disc bulge with bilateral recessed nerve and more on left side, otherwise normal.';

    const result = await processVoiceDictation({
      rawTranscript: transcript,
      modality: 'MRI',
      studyDescription: 'MRI Lumbar Spine (Disc / Radiculopathy)',
      patientAge: '17',
      patientGender: 'Female',
      radiologistName: 'Dr. Jane Doe (Resident Radiologist)',
    });

    expect(result.findings).toContain('<p>');
    expect(result.findings).toContain('<strong>');
    expect(result.impression).toBeTruthy();
    expect(result.clinicalHistory).toBeTruthy();
    expect(result.technique).toBeTruthy();
    expect(result.signOff).toContain('Dr. Jane Doe (Resident Radiologist)');
  });

  it('manages custom system instructions in AI settings', () => {
    const original = getAISettings();
    const customPrompt = 'Custom radiologist instructions test';

    saveAISettings({ customStructuringPrompt: customPrompt });
    const updated = getAISettings();
    expect(updated.customStructuringPrompt).toBe(customPrompt);

    // Restore default
    saveAISettings({ customStructuringPrompt: original.customStructuringPrompt || DEFAULT_STRUCTURING_PROMPT });
  });

  it('converts markdown bullet lists with nested disc sub-levels and headers into semantic HTML', () => {
    const markdownFindings = `### Findings
- **Curvature, Alignment & Vertebrae:** Straightening of normal lumbar lordosis.
- **Intervertebral Discs & Neural Canal:**
  - **L1–L2 & L2–L3:** Discs are preserved.
  - **L4–L5:** Diffuse disc bulge with bilateral recess narrowing.
- **Cord & Soft Tissues:** Conus medullaris terminates normally.`;

    const html = formatClinicalFindingsHtml(
      markdownFindings,
      'MRI',
      'Multiplanar MRI of lumbar spine performed without IV contrast.'
    );

    expect(html).toContain('<h3>Technique</h3>');
    expect(html).toContain('<p>Multiplanar MRI of lumbar spine performed without IV contrast.</p>');
    expect(html).toContain('<h3>Findings</h3>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li><strong>Curvature, Alignment & Vertebrae:</strong> Straightening of normal lumbar lordosis.</li>');
    expect(html).toContain('<li><strong>Intervertebral Discs & Neural Canal:</strong><ul>');
    expect(html).toContain('<strong>L4–L5:</strong>');
    expect(html).toContain('Diffuse disc bulge');
    expect(html).toContain('recess narrowing');
    expect(html).toContain('</ul></li>');
    expect(html).toContain('<li><strong>Cord & Soft Tissues:</strong> Conus medullaris terminates normally.</li>');
  });

  it('does not duplicate technique if already present in findings text', () => {
    const withTechnique = `<h3>Technique</h3><p>Already documented protocol.</p><h3>Findings</h3><p>Normal spine.</p>`;
    const html = formatClinicalFindingsHtml(withTechnique, 'MRI', 'New technique that should not duplicate');
    const techniqueMatches = html.match(/<h3>Technique<\/h3>/g);
    expect(techniqueMatches).toHaveLength(1);
    expect(html).toContain('Already documented protocol.');
  });
});
