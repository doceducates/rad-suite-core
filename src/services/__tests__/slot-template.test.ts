import { describe, it, expect } from 'vitest';
import { mergeFindingsWithSlots } from '../slot-template.service';
import { HIGH_VOLUME_SLOT_TEMPLATES } from '../slot-templates.data';

describe('Subtractive Slot-Based Template Merger Engine', () => {
  const pelvisTemplate = HIGH_VOLUME_SLOT_TEMPLATES.find((t) => t.id === 'mri-pelvis-female')!;
  const kneeTemplate = HIGH_VOLUME_SLOT_TEMPLATES.find((t) => t.id === 'mri-knee')!;

  it('suppresses normal uterus when uterine fibroid finding is dictated', () => {
    const dictation = 'Large fundal intramural uterine fibroid noted measuring 4.5 x 3.2 cm with cystic degeneration.';
    const result = mergeFindingsWithSlots(pelvisTemplate, dictation, 'suppress');

    expect(result.suppressedNormalsCount).toBe(1);
    // Normal uterus sentence must NOT appear
    expect(result.findingsHtml).not.toContain('The uterus demonstrates normal anteverted configuration');
    // Dictated fibroid finding MUST appear
    expect(result.findingsHtml).toContain('Large fundal intramural uterine fibroid');
    // Normal ovaries must be preserved
    expect(result.findingsHtml).toContain('Both ovaries demonstrate normal follicular architecture');
    // Normal bladder must be preserved
    expect(result.findingsHtml).toContain('Urinary bladder is moderately distended');
  });

  it('supports strikethrough mode for visual verification of replaced normal', () => {
    const dictation = 'Large fundal uterine fibroid.';
    const result = mergeFindingsWithSlots(pelvisTemplate, dictation, 'strikethrough');

    expect(result.findingsHtml).toContain('line-through');
    expect(result.findingsHtml).toContain('The uterus demonstrates normal anteverted configuration');
    expect(result.findingsHtml).toContain('Large fundal uterine fibroid');
  });

  it('replaces multiple organ slots independently on knee MRI', () => {
    const dictation = 'Complete full-thickness tear of the anterior cruciate ligament. High-grade radial tear of medial meniscus posterior horn.';
    const result = mergeFindingsWithSlots(kneeTemplate, dictation, 'suppress');

    expect(result.suppressedNormalsCount).toBe(2);
    // ACL normal suppressed
    expect(result.findingsHtml).not.toContain('Anterior cruciate ligament (ACL) demonstrates normal fiber orientation');
    // Medial meniscus normal suppressed
    expect(result.findingsHtml).not.toContain('Medial meniscus demonstrates normal triangular morphology');
    // PCL normal preserved
    expect(result.findingsHtml).toContain('Posterior cruciate ligament (PCL) is intact');
    // Collaterals normal preserved
    expect(result.findingsHtml).toContain('Medial and lateral collateral ligaments are intact');
  });
});
