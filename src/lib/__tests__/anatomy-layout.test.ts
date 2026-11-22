import { describe, it, expect } from 'vitest';
import {
  splitLabel,
  relaxVerticalPositions,
  pickTopPrioritized,
  computeCalloutPaths,
  brightenAnatomyColor,
  getResponsiveLayoutConfig,
  type LayoutPoint,
} from '../anatomy-layout';

describe('Anatomy Callout Geometry Engine (anatomy-layout)', () => {
  describe('splitLabel', () => {
    it('returns single line when text length is within limit', () => {
      const res = splitLabel('Aorta', 20);
      expect(res).toEqual(['Aorta']);
    });

    it('splits multiple words cleanly across two lines', () => {
      const res = splitLabel('Internal Carotid Artery', 16);
      expect(res.length).toBe(2);
      expect(res[0]).toBe('Internal Carotid');
      expect(res[1]).toBe('Artery');
    });

    it('handles long single words with ellipsis', () => {
      const res = splitLabel('Sternocleidomastoideus', 12);
      expect(res[0].endsWith('…')).toBe(true);
      expect(res[0].length).toBeLessThanOrEqual(12);
    });
  });

  describe('relaxVerticalPositions', () => {
    it('maintains minimum vertical separation between colliding items', () => {
      const items: LayoutPoint[] = [
        { id: 1, structure_id: 10, name_en: 'A', px: 100, py: 100, isLeft: true },
        { id: 2, structure_id: 20, name_en: 'B', px: 100, py: 105, isLeft: true },
        { id: 3, structure_id: 30, name_en: 'C', px: 100, py: 108, isLeft: true },
      ];

      relaxVerticalPositions(items, 20, 500, 22);

      expect(items[1].targetY! - items[0].targetY!).toBeGreaterThanOrEqual(22);
      expect(items[2].targetY! - items[1].targetY!).toBeGreaterThanOrEqual(22);
    });

    it('respects topMin and bottomMax boundaries', () => {
      const items: LayoutPoint[] = [
        { id: 1, structure_id: 10, name_en: 'Top', px: 50, py: 10, isLeft: true },
        { id: 2, structure_id: 20, name_en: 'Bottom', px: 50, py: 600, isLeft: true },
      ];

      relaxVerticalPositions(items, 30, 400, 22);

      expect(items[0].targetY).toBeGreaterThanOrEqual(30);
      expect(items[1].targetY).toBeLessThanOrEqual(400);
    });
  });

  describe('pickTopPrioritized', () => {
    it('returns original list if size is within maxCount', () => {
      const items: LayoutPoint[] = [
        { id: 1, structure_id: 10, name_en: 'A', px: 50, py: 50, isLeft: true },
      ];
      expect(pickTopPrioritized(items, 5)).toEqual(items);
    });

    it('selects highest priority items and ensures selected item is never dropped', () => {
      const items: LayoutPoint[] = [
        { id: 1, structure_id: 1, name_en: 'Low1', priority: 1, px: 0, py: 0, isLeft: true },
        { id: 2, structure_id: 2, name_en: 'High1', priority: 10, px: 0, py: 0, isLeft: true },
        { id: 3, structure_id: 3, name_en: 'High2', priority: 9, px: 0, py: 0, isLeft: true },
        { id: 4, structure_id: 4, name_en: 'SelectedTarget', priority: 2, px: 0, py: 0, isLeft: true },
      ];

      const picked = pickTopPrioritized(items, 2, 4);
      expect(picked.length).toBe(2);
      expect(picked.some((p) => p.structure_id === 4)).toBe(true);
    });
  });

  describe('computeCalloutPaths', () => {
    it('computes valid SVG path syntax for left and right orientations', () => {
      const itemLeft: LayoutPoint = {
        id: 1,
        structure_id: 10,
        name_en: 'Left Landmark',
        px: 150,
        py: 200,
        targetY: 190,
        isLeft: true,
      };
      const leftPaths = computeCalloutPaths(itemLeft, 50, true);
      expect(leftPaths.leaderD.startsWith('M 150 200')).toBe(true);
      expect(leftPaths.bracketD.includes('L 50')).toBe(true);
      expect(leftPaths.anchor).toBe('end');

      const itemRight: LayoutPoint = {
        id: 2,
        structure_id: 20,
        name_en: 'Right Landmark',
        px: 300,
        py: 220,
        targetY: 230,
        isLeft: false,
      };
      const rightPaths = computeCalloutPaths(itemRight, 400, false);
      expect(rightPaths.leaderD.startsWith('M 300 220')).toBe(true);
      expect(rightPaths.bracketD.includes('L 400')).toBe(true);
      expect(rightPaths.anchor).toBe('start');
    });
  });

  describe('brightenAnatomyColor', () => {
    it('boosts dark print hex colors into vivid, high-contrast dark-mode colors', () => {
      const navy = brightenAnatomyColor('#000080');
      expect(navy).not.toBe('#000080');
      // Verify brightness/luminance increased
      const r = parseInt(navy.slice(1, 3), 16);
      const g = parseInt(navy.slice(3, 5), 16);
      const b = parseInt(navy.slice(5, 7), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(lum).toBeGreaterThanOrEqual(0.35);

      const darkPurple = brightenAnatomyColor('#2E0854');
      expect(darkPurple).not.toBe('#2E0854');

      const darkGreen = brightenAnatomyColor('#14532D');
      expect(darkGreen).not.toBe('#14532D');
    });

    it('preserves already bright colors and returns fallback on invalid input', () => {
      expect(brightenAnatomyColor('#00e5ff')).toBe('#00e5ff');
      expect(brightenAnatomyColor(null)).toBe('#38bdf8');
      expect(brightenAnatomyColor('')).toBe('#38bdf8');
    });
  });

  describe('getResponsiveLayoutConfig', () => {
    it('scales font size, char width, and line wrapping dynamically based on screen width', () => {
      const mobile = getResponsiveLayoutConfig(480, 'md');
      const standard = getResponsiveLayoutConfig(1100, 'md');
      const ultrawide = getResponsiveLayoutConfig(1920, 'md');

      expect(mobile.fontSizePx).toBeLessThan(standard.fontSizePx);
      expect(standard.fontSizePx).toBeLessThan(ultrawide.fontSizePx);
      expect(ultrawide.fontSizePx).toBeGreaterThanOrEqual(14);

      // Verify char wrapping limits grow with screen width
      expect(mobile.maxCharsPerLine).toBeLessThanOrEqual(20);
      expect(ultrawide.maxCharsPerLine).toBeGreaterThanOrEqual(32);

      // Verify line thicknesses and pin radii scale with space
      expect(ultrawide.strokeLeaderNormal).toBeGreaterThan(mobile.strokeLeaderNormal);
      expect(ultrawide.pinRadiusActive).toBeGreaterThan(mobile.pinRadiusActive);
    });

    it('respects user textSize modifier preference', () => {
      const sm = getResponsiveLayoutConfig(1200, 'sm');
      const md = getResponsiveLayoutConfig(1200, 'md');
      const lg = getResponsiveLayoutConfig(1200, 'lg');

      expect(sm.fontSizePx).toBeLessThan(md.fontSizePx);
      expect(md.fontSizePx).toBeLessThan(lg.fontSizePx);
    });
  });
});
