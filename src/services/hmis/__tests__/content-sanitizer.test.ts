import { describe, it, expect } from 'vitest';
import {
  stripDuplicateHeadings,
  normalizeHtmlForComparison,
  compareHmisContent,
} from '../content-sanitizer';

describe('HMIS Content Sanitizer', () => {
  it('strips redundant History headings to avoid duplicate headers on HMIS PDF', () => {
    const raw = '<p><strong>HISTORY:</strong></p> Low backache radiating to right lower limb.';
    const cleaned = stripDuplicateHeadings(raw, 'history');
    expect(cleaned).toBe('Low backache radiating to right lower limb.');

    const plain = 'CLINICAL HISTORY: Patient presented with sciatica.';
    expect(stripDuplicateHeadings(plain, 'history')).toBe('Patient presented with sciatica.');
  });

  it('strips redundant Impression headings to avoid duplicate headers on HMIS PDF', () => {
    const raw = '<p><strong>IMPRESSION:</strong></p> L4-L5 disc protrusion causing neural compression.';
    const cleaned = stripDuplicateHeadings(raw, 'impression');
    expect(cleaned).toBe('L4-L5 disc protrusion causing neural compression.');

    const plain = 'DIAGNOSTIC IMPRESSION: Normal study.';
    expect(stripDuplicateHeadings(plain, 'impression')).toBe('Normal study.');
  });

  it('normalizes HTML for accurate read-back comparison', () => {
    const htmlA = '<p>Vertebral body heights are maintained.&nbsp;No disc herniation.</p>';
    const htmlB = '<div>vertebral body heights are maintained. No disc herniation.</div>';
    expect(normalizeHtmlForComparison(htmlA)).toBe(normalizeHtmlForComparison(htmlB));
  });

  it('successfully matches intended vs actual content even with minor markup divergence', () => {
    const intended = 'L4-L5 broad based disc bulge indenting the ventral thecal sac.';
    const actualFromHmis = '<p>L4-L5 broad based disc bulge indenting the ventral thecal sac.</p><br><p>Attribution: PGR</p>';
    const result = compareHmisContent(intended, actualFromHmis);
    expect(result.matches).toBe(true);
    expect(result.similarity).toBeGreaterThan(0.7);
  });

  it('detects genuine content mismatches or empty save reverts', () => {
    const intended = 'Severe central spinal canal stenosis at L3-L4.';
    const emptyActual = '<p><br data-mce-bogus="1"></p>';
    const result = compareHmisContent(intended, emptyActual);
    expect(result.matches).toBe(false);
  });
});
