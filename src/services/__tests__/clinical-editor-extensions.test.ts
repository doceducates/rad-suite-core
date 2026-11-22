import { describe, it, expect } from 'vitest';
import { stripClinicalCommentMarks, htmlToClinicalText } from '@/lib/clinical-format';

describe('Clinical Editor Notion Extensions & HMIS Sanitizer', () => {
  it('stripClinicalCommentMarks removes discussion span tags while preserving inner text', () => {
    const htmlWithComment = '<p>L4-L5: <span data-comment-id="cmt_12345" class="clinical-comment-mark">Broad based disc extrusion</span> causing bilateral recess compromise.</p>';
    const cleaned = stripClinicalCommentMarks(htmlWithComment);

    expect(cleaned).toBe('<p>L4-L5: Broad based disc extrusion causing bilateral recess compromise.</p>');
    expect(cleaned).not.toContain('data-comment-id');
    expect(cleaned).not.toContain('clinical-comment-mark');
  });

  it('stripClinicalCommentMarks handles multiple nested and sequential comments', () => {
    const raw = '<p><span data-comment-id="c1">L4-L5 bulge</span> and <span data-comment-id="c2">L5-S1 tear</span>.</p>';
    const cleaned = stripClinicalCommentMarks(raw);
    expect(cleaned).toBe('<p>L4-L5 bulge and L5-S1 tear.</p>');
  });

  it('htmlToClinicalText strips comment marks and produces clean plain text for HMIS', () => {
    const raw = '<h3>Findings:</h3><p>L4-L5: <span data-comment-id="cmt_999">Extrusion 4.2mm</span>.</p>';
    const plain = htmlToClinicalText(stripClinicalCommentMarks(raw));

    expect(plain).toContain('Findings:');
    expect(plain).toContain('L4-L5: Extrusion 4.2mm.');
    expect(plain).not.toContain('data-comment-id');
    expect(plain).not.toContain('<span');
  });

  it('handles null and undefined gracefully without throwing', () => {
    expect(stripClinicalCommentMarks(null)).toBe('');
    expect(stripClinicalCommentMarks(undefined)).toBe('');
    expect(stripClinicalCommentMarks('')).toBe('');
  });

  it('computeSmartCommentCoords docks in right free space when space >= 220px', async () => {
    const { computeSmartCommentCoords } = await import('@/components/editor/clinical-editor/clinical-comment-types');
    const mockContainer = {
      getBoundingClientRect: () => ({
        top: 100,
        bottom: 500,
        left: 200,
        right: 900,
        width: 700,
        height: 400,
      }),
    } as any;

    // Simulate 1400px wide window (space to right is 1400 - 900 = 500px >= 220px)
    (globalThis as any).window = { innerWidth: 1400, innerHeight: 900 };
    const coords = computeSmartCommentCoords(mockContainer, 150);
    expect(coords.left).toBe(916); // 900 + 16px
    expect(coords.top).toBe(150);
  });

  it('computeSmartCommentCoords centers gracefully on mobile or narrow screen (< 768px)', async () => {
    const { computeSmartCommentCoords } = await import('@/components/editor/clinical-editor/clinical-comment-types');
    const mockContainer = {
      getBoundingClientRect: () => ({ top: 100, bottom: 500, left: 10, right: 360, width: 350, height: 400 }),
    } as any;

    (globalThis as any).window = { innerWidth: 375, innerHeight: 667 };
    const coords = computeSmartCommentCoords(mockContainer, 150);
    // Centered modal
    expect(coords.left).toBe(27.5); // (375 - 320) / 2
    expect(coords.top).toBe(163.5); // (667 - 340) / 2
  });

  it('COMMENT_COLOR_PALETTES provides five clinical semantic themes', async () => {
    const { COMMENT_COLOR_PALETTES } = await import('@/components/editor/clinical-editor/clinical-comment-types');
    expect(COMMENT_COLOR_PALETTES).toHaveProperty('indigo');
    expect(COMMENT_COLOR_PALETTES).toHaveProperty('teal');
    expect(COMMENT_COLOR_PALETTES).toHaveProperty('rose');
    expect(COMMENT_COLOR_PALETTES).toHaveProperty('amber');
    expect(COMMENT_COLOR_PALETTES).toHaveProperty('sky');
  });
});
