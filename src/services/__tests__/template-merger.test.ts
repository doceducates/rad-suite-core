import { describe, it, expect } from 'vitest';
import { mergeCrossSectionalTemplates } from '../template-merger.service';
import { getStandardizedTemplateById } from '../cross-sectional';

describe('Multi-Template Composition & Deduplication Engine', () => {
  it('should cleanly merge CT Chest and CT Abdomen & Pelvis into a unified CT CAP protocol without duplicate normals', () => {
    const chest = getStandardizedTemplateById('ct-chest-cect');
    const abdomenPelvis = getStandardizedTemplateById('ct-abdomen-pelvis-cect');

    expect(chest).toBeDefined();
    expect(abdomenPelvis).toBeDefined();

    const merged = mergeCrossSectionalTemplates([chest!, abdomenPelvis!], 'CT Chest, Abdomen & Pelvis (CAP Staging)');

    expect(merged.name).toBe('CT Chest, Abdomen & Pelvis (CAP Staging)');
    expect(merged.modality).toBe('CT');

    // Check that transitional overlap statements were suppressed
    const serialized = JSON.stringify(merged.normalFindings).toLowerCase();
    expect(serialized).not.toContain('sections through lower chest');
    expect(serialized).not.toContain('visualized upper abdominal viscera are grossly unremarkable');

    // Check that osseous statement was unified into a single entry
    const osseousOccurrences = merged.normalFindings.filter((f) =>
      /axial and appendicular osseous structures/i.test(f)
    );
    expect(osseousOccurrences.length).toBe(1);

    // Both lungs and liver should be present
    expect(serialized).toContain('lungs are clear');
    expect(serialized).toContain('liver demonstrates normal size');

    // Impression must be merged and cleanly numbered
    expect(merged.defaultImpression).toMatch(/^1\.\s+/);
    expect(merged.defaultImpression).toContain('Clear lung parenchyma bilaterally');
    expect(merged.defaultImpression).toContain('No acute intra-abdominal inflammatory process');
  });

  it('should reject merging across different modalities (CT + MRI)', () => {
    const ctBrain = getStandardizedTemplateById('ct-brain-plain');
    const mriBrain = getStandardizedTemplateById('mri-brain-routine');

    expect(() => {
      mergeCrossSectionalTemplates([ctBrain!, mriBrain!]);
    }).toThrow(/not permitted/);
  });
});
