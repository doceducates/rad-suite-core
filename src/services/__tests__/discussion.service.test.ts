// Layer 2 Tests: Clinical Discussion Service & Report Compilation Tests
import { describe, it, expect } from 'vitest';
import {
  compileDiscussionToReportHtml,
  findingsToBulletHtml,
  extractFindingsFromHtml,
} from '@/lib/discussion-compiler';

describe('Discussion Service & Report Compiler', () => {
  it('correctly compiles positive findings and consultant notes into structured clinical HTML', () => {
    const findings = [
      {
        id: 'f1',
        label: 'L4–L5',
        text: 'Diffuse disc bulge, 6 o\'clock annular fissure, bilateral lateral recess narrowing, right L5 traversing root abutment.',
      },
      {
        id: 'f2',
        label: 'L5–S1',
        text: 'Diffuse non-compressive disc bulge.',
      },
      {
        id: 'f3',
        label: 'Vertebrae/Alignment',
        text: 'Normal lordosis; partial disc desiccation at L4–L5.',
      },
    ];

    const consultantNotes = 'Urgent Note: Clinical correlation for right leg drop post-IM injection.';
    const pgrName = 'Dr. Muhammad Mudassir';

    const compiled = compileDiscussionToReportHtml(findings, consultantNotes, pgrName);

    // Verify Findings HTML
    expect(compiled.findingsHtml).toContain('<strong>L4–L5:</strong>');
    expect(compiled.findingsHtml).toContain('6 o\'clock annular fissure');
    expect(compiled.findingsHtml).toContain('<strong>L5–S1:</strong>');
    expect(compiled.findingsHtml).toContain('<strong>Vertebrae/Alignment:</strong>');

    // Verify Impression HTML
    expect(compiled.impressionHtml).toContain('<strong>L4–L5:</strong>');
    expect(compiled.impressionHtml).toContain('<strong>Consultant Note / Clinical Takeaway:</strong>');
    expect(compiled.impressionHtml).toContain('Clinical correlation for right leg drop');
    expect(compiled.impressionHtml).toContain('Reported by:');
    expect(compiled.impressionHtml).toContain('Dr. Muhammad Mudassir');
  });

  it('handles empty positive findings gracefully as unremarkable baseline', () => {
    const compiled = compileDiscussionToReportHtml([], '', 'Dr. Muhammad Mudassir');
    expect(compiled.findingsHtml).toContain('Standard unremarkable baseline preserved');
    expect(compiled.impressionHtml).toContain('No focal acute abnormal findings identified');
  });

  it('converts DiscussionFinding array to bullet HTML and back', () => {
    const findings = [
      { id: '1', label: 'L4–L5', text: 'Diffuse disc bulge' },
      { id: '2', label: 'L3–L4', text: 'Annular tear' },
    ];

    const html = findingsToBulletHtml(findings);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li><p><strong>L4–L5:</strong> Diffuse disc bulge</p></li>');
    expect(html).toContain('<li><p><strong>L3–L4:</strong> Annular tear</p></li>');

    const extracted = extractFindingsFromHtml(html);
    expect(extracted.length).toBe(2);
    expect(extracted[0].label).toBe('L4–L5');
    expect(extracted[0].text).toBe('Diffuse disc bulge');
    expect(extracted[1].label).toBe('L3–L4');
    expect(extracted[1].text).toBe('Annular tear');
  });

  it('compiles directly from rich HTML bullet points', () => {
    const html = '<ul><li><p><strong>L4–L5:</strong> Severe canal stenosis</p></li></ul>';
    const notes = 'Consultant agrees with decompression recommendation.';
    const compiled = compileDiscussionToReportHtml(html, notes, 'Dr. Muhammad Mudassir');

    expect(compiled.findingsHtml).toBe(html);
    expect(compiled.impressionHtml).toContain('<strong>L4–L5:</strong> Severe canal stenosis');
    expect(compiled.impressionHtml).toContain('Consultant agrees with decompression recommendation');
  });
});
