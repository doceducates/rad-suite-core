// Unit tests for Template Style Engine
import { describe, it, expect } from 'vitest';
import {
  detectReportStyle,
  formatFindingsForStyle,
  convertReportToStyle,
} from '@/services/template-style-engine.service';

describe('template-style-engine', () => {
  const normalSpineFindings = [
    'Alignment: Normal lumbar lordosis is maintained. Vertebral heights and marrow signal are preserved.',
    'L1-L2: Preserved disc height. Spinal canal and neural exit foramina are patent.',
    'L2-L3: Preserved disc height. Spinal canal and neural exit foramina are patent.',
    'L3-L4: Preserved disc height. Spinal canal and neural exit foramina are patent.',
    'L4-L5: Mild diffuse disc bulge indenting the thecal sac without canal stenosis.',
    'L5-S1: Preserved disc height. Neural exit foramina are patent.',
    'Conus & Soft Tissues: Conus medullaris terminates normally at L1 level. Paraspinal muscles are normal.',
  ];

  it('detects report style accurately', () => {
    const withH3 = '<h3>Technique</h3><p>MRI LS Spine</p><h3>Findings</h3><p>L4-L5 bulge</p>';
    const pureBullets = '<ul><li><p><strong>L4-L5:</strong> Bulge</p></li></ul>';

    expect(detectReportStyle(withH3)).toBe('categorized_headings');
    expect(detectReportStyle(pureBullets)).toBe('pure_bullets');
  });

  it('formats findings into pure bullets without H3 headers', () => {
    const formatted = formatFindingsForStyle(normalSpineFindings, 'pure_bullets');
    expect(formatted).toContain('<ul>');
    expect(formatted).toContain('<li><p><strong>L4-L5:</strong>');
    expect(formatted).not.toContain('<h3>Technique</h3>');
    expect(formatted).not.toContain('<h3>Findings</h3>');
  });

  it('formats findings into categorized headings with H3 headers', () => {
    const formatted = formatFindingsForStyle(normalSpineFindings, 'categorized_headings', 'Sagittal and Axial MRI');
    expect(formatted).toContain('<h3>Technique</h3>');
    expect(formatted).toContain('<h3>Findings</h3>');
    expect(formatted).toContain('<p><strong>L4-L5:</strong>');
  });

  it('converts losslessly from Categorized H3 to Pure Bullets', () => {
    const h3Report = '<h3>Technique</h3><p>Standard MRI</p><h3>Findings</h3><p><strong>L4-L5:</strong> Protrusion</p><p><strong>L5-S1:</strong> Patent</p>';
    const converted = convertReportToStyle(h3Report, 'pure_bullets');

    expect(converted.changesMade).toBe(true);
    expect(converted.style).toBe('pure_bullets');
    expect(converted.findingsHtml).toContain('<ul>');
    expect(converted.findingsHtml).toContain('<strong>L4-L5:</strong> Protrusion');
    expect(converted.findingsHtml).not.toContain('<h3>Findings</h3>');
  });

  it('converts losslessly from Pure Bullets to Categorized H3', () => {
    const bulletReport = '<ul><li><p><strong>L4-L5:</strong> Protrusion</p></li><li><p><strong>L5-S1:</strong> Patent</p></li></ul>';
    const converted = convertReportToStyle(bulletReport, 'categorized_headings', 'Standard MRI');

    expect(converted.changesMade).toBe(true);
    expect(converted.style).toBe('categorized_headings');
    expect(converted.findingsHtml).toContain('<h3>Findings</h3>');
    expect(converted.findingsHtml).toContain('<p><strong>L4-L5:</strong> Protrusion</p>');
  });
});
