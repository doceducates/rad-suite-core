// Unit tests for Clinical Diff Engine
import { describe, it, expect } from 'vitest';
import {
  diffWords,
  computeDiffStats,
  extractAnatomicalSections,
  diffByLevels,
  compareSidebarWithReport,
  cleanHtmlText,
} from '@/lib/clinical-diff-engine';

describe('clinical-diff-engine', () => {
  it('correctly cleans HTML tags and entity codes', () => {
    const raw = '<p><strong>L4–L5:</strong> Diffuse disc bulge &amp; stenosis.</p>';
    const cleaned = cleanHtmlText(raw);
    expect(cleaned).toContain('L4–L5: Diffuse disc bulge & stenosis.');
  });

  it('performs word-level LCS diff with added, removed, and equal tokens', () => {
    const oldStr = 'mild diffuse disc bulge at L4-L5 without canal stenosis';
    const newStr = 'moderate diffuse disc bulge at L4-L5 with severe canal stenosis';

    const tokens = diffWords(oldStr, newStr);
    expect(tokens.length).toBeGreaterThan(0);

    const stats = computeDiffStats(tokens);
    expect(stats.addedWords).toBeGreaterThan(0);
    expect(stats.removedWords).toBeGreaterThan(0);
    expect(stats.unchangedWords).toBeGreaterThan(0);

    // Verify 'severe' was added and 'without' was removed
    const addedTokens = tokens.filter((t) => t.type === 'added').map((t) => t.value);
    const removedTokens = tokens.filter((t) => t.type === 'removed').map((t) => t.value);

    expect(addedTokens).toContain('severe');
    expect(removedTokens).toContain('without');
  });

  it('extracts anatomical sections and compares level by level', () => {
    const oldReport = `
      <p><strong>L3-L4:</strong> Normal disc height. Canal is patent.</p>
      <p><strong>L4-L5:</strong> Mild disc bulge.</p>
      <p><strong>L5-S1:</strong> Unremarkable.</p>
    `;
    const newReport = `
      <p><strong>L3-L4:</strong> Normal disc height. Canal is patent.</p>
      <p><strong>L4-L5:</strong> Moderate disc extrusion with left traversing root compression.</p>
      <p><strong>L5-S1:</strong> Unremarkable.</p>
    `;

    const levelDiffs = diffByLevels(oldReport, newReport);
    const l4l5Diff = levelDiffs.find((d) => d.level === 'L4-L5');

    expect(l4l5Diff).toBeDefined();
    expect(l4l5Diff?.status).toBe('modified');
    expect(l4l5Diff?.oldText).toContain('Mild disc bulge');
    expect(l4l5Diff?.newText).toContain('Moderate disc extrusion');

    const l3l4Diff = levelDiffs.find((d) => d.level === 'L3-L4');
    expect(l3l4Diff?.status).toBe('unchanged');
  });

  it('detects discrepancies between sidebar positive findings and main report body', () => {
    const sidebarFindings = [
      { id: '1', label: 'L4-L5', text: 'Diffuse bulge causing left recess narrowing' },
      { id: '2', label: 'Extraspinal', text: 'Incidental 2.4cm simple left renal cyst' },
    ];
    const consultantNotes = 'Advise neurosurgical consultation';

    // Main report is missing extraspinal finding
    const reportFindings = '<p><strong>L4-L5:</strong> Diffuse bulge causing left recess narrowing.</p>';
    const reportImpression = '<p>1. L4-L5 disc bulge.</p>';

    const discrepancies = compareSidebarWithReport(
      sidebarFindings,
      consultantNotes,
      reportFindings,
      reportImpression
    );

    const extraspinal = discrepancies.find((d) => d.label === 'Extraspinal');
    expect(extraspinal).toBeDefined();
    expect(extraspinal?.status).toBe('sidebar_only');

    const notes = discrepancies.find((d) => d.label === 'Consultant Takeaway');
    expect(notes).toBeDefined();
    expect(notes?.status).toBe('sidebar_only');
  });
});
