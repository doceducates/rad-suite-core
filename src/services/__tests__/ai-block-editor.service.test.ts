import { describe, it, expect } from 'vitest';
import { processAiBlockEdit } from '../ai-block-editor.service';

describe('AI Block Editor Domain Service', () => {
  it('standardizes measurements and medical abbreviations in fallback mode', async () => {
    const raw = 'Right renal calculus measuring 12 by 14 mm. Gall ladder is normal. c/o flank pain status post stent.';
    const res = await processAiBlockEdit({
      action: 'standardize',
      text: raw,
      modality: 'CT',
    });

    expect(res.action).toBe('standardize');
    expect(res.result).toContain('12 x 14 mm');
    expect(res.result).toContain('gallbladder');
    expect(res.result).toContain('C/o');
    expect(res.result).toContain('S/p');
  });

  it('synthesizes numbered impressions from findings with pathology', async () => {
    const findings = 'Acute cortical fracture of the right distal radius. Marked soft tissue swelling.';
    const res = await processAiBlockEdit({
      action: 'impression',
      text: findings,
      modality: 'XR',
    });

    expect(res.action).toBe('impression');
    expect(res.result).toMatch(/1\.\s*Acute cortical fracture/i);
  });

  it('generates pertinent normal impression if no focal lesion found', async () => {
    const findings = 'Normal liver, gallbladder, pancreas, and spleen.';
    const res = await processAiBlockEdit({
      action: 'impression',
      text: findings,
      modality: 'CT',
    });

    expect(res.result).toContain('No acute diagnostic abnormality identified');
  });

  it('generates simplified patient discharge summary', async () => {
    const findings = 'Unremarkable non-contrast CT brain. No hemorrhage.';
    const res = await processAiBlockEdit({
      action: 'simplify',
      text: findings,
      modality: 'CT',
    });

    expect(res.action).toBe('simplify');
    expect(res.result).toContain('Patient Summary:');
  });
});
