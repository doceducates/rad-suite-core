// Unit tests for Two-Tier Impression Generator
import { describe, it, expect } from 'vitest';
import {
  parseAge,
  applyAgeVocabularyFilter,
  generateHeuristicImpression,
  generateTwoTierImpression,
} from '@/services/two-tier-impression.service';

describe('two-tier-impression.service', () => {
  it('parses age strings and numbers correctly', () => {
    expect(parseAge(25)).toBe(25);
    expect(parseAge('25Y')).toBe(25);
    expect(parseAge('48 years old')).toBe(48);
    expect(parseAge(undefined)).toBeNull();
  });

  it('strictly suppresses "spondylosis" in young patients under 30 years old', () => {
    const rawText = 'Lumbar spondylotic changes with disc bulges at L4-L5.';
    const filteredYoung = applyAgeVocabularyFilter(rawText, 22);
    expect(filteredYoung.toLowerCase()).not.toContain('spondylosis');
    expect(filteredYoung.toLowerCase()).not.toContain('spondylotic');
    expect(filteredYoung).toContain('Disc bulges');

    // Older patient retains spondylosis
    const filteredOld = applyAgeVocabularyFilter(rawText, 55);
    expect(filteredOld).toContain('spondylotic changes');
  });

  it('generates concise local high-yield impression with predominant levels', () => {
    const findings = `
      L3-L4: Normal disc height.
      L4-L5: Diffuse disc bulge with left lateral recess narrowing and root abutment.
      L5-S1: Mild disc bulge indenting thecal sac.
    `;
    const impression = generateHeuristicImpression(findings, 45, 'local_high_yield');

    expect(impression).toContain('Lumbar spondylotic changes with disc bulges');
    expect(impression).toContain('more marked at');
    const bulletCount = impression.split('\n').filter(Boolean).length;
    expect(bulletCount).toBeLessThanOrEqual(3);
  });

  it('generates international structured format with level separation', () => {
    const findings = `
      L4-L5: Diffuse disc bulge with moderate central canal stenosis.
      L5-S1: Neural exit foraminal stenosis.
    `;
    const impression = generateHeuristicImpression(findings, 50, 'international_structured');

    expect(impression).toContain('1.');
    expect(impression).toContain('2.');
  });

  it('returns unremarkable default for normal scans', async () => {
    const res = await generateTwoTierImpression({
      findings: 'L1-L2 to L5-S1 intervertebral disc spaces demonstrate preserved height without bulge.',
      flavor: 'local_high_yield',
      patientAge: 25,
    });

    expect(res.bulletCount).toBeGreaterThanOrEqual(1);
    expect(res.impressionText.toLowerCase()).toContain('no acute');
  });
});
