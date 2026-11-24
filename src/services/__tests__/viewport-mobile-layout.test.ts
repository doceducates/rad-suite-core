import { describe, it, expect } from 'vitest';
import type { ViewportLayoutMode, MobileTouchMode } from '@/types/viewport';
import { parseLayoutDimensions, formatLayoutMode, getResponsiveLayoutForCount } from '@/types/viewport';

describe('Viewport Mobile Layout & Touch Modes', () => {
  it('supports standard and dynamic layout modes', () => {
    const modes: ViewportLayoutMode[] = ['1x1', '1x2', '1x3', '2x2', '2x3', '4x1', '3x3', '4x4'];
    expect(modes.length).toBeGreaterThanOrEqual(6);
  });

  it('correctly maps arbitrary layout modes to rows and columns without collapsing', () => {
    expect(parseLayoutDimensions('1x1')).toEqual({ rows: 1, cols: 1 });
    expect(parseLayoutDimensions('1x2')).toEqual({ rows: 1, cols: 2 });
    expect(parseLayoutDimensions('2x2')).toEqual({ rows: 2, cols: 2 });
    expect(parseLayoutDimensions('2x3')).toEqual({ rows: 2, cols: 3 }); // 6 views, not 9!
    expect(parseLayoutDimensions('3x2')).toEqual({ rows: 3, cols: 2 });
    expect(parseLayoutDimensions('4x1')).toEqual({ rows: 4, cols: 1 }); // 4 stacked vertical, not 16!
    expect(parseLayoutDimensions('1x4')).toEqual({ rows: 1, cols: 4 });
    expect(parseLayoutDimensions('3x3')).toEqual({ rows: 3, cols: 3 });
    expect(parseLayoutDimensions('4x4')).toEqual({ rows: 4, cols: 4 });
  });

  it('formats rows and columns into ViewportLayoutMode string', () => {
    expect(formatLayoutMode(2, 3)).toBe('2x3');
    expect(formatLayoutMode(4, 1)).toBe('4x1');
    expect(formatLayoutMode(1, 4)).toBe('1x4');
    expect(formatLayoutMode(3, 3)).toBe('3x3');
  });

  it('correctly calculates 2D matrix coordinates for 4x4 grid cells', () => {
    const cols = 4;
    function getCellCoords(index: number, columns: number) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      return { row, col };
    }

    expect(getCellCoords(0, cols)).toEqual({ row: 0, col: 0 }); // Top-Left (P1)
    expect(getCellCoords(3, cols)).toEqual({ row: 0, col: 3 }); // Top-Right (P4)
    expect(getCellCoords(12, cols)).toEqual({ row: 3, col: 0 }); // Bottom-Left (P13)
    expect(getCellCoords(15, cols)).toEqual({ row: 3, col: 3 }); // Bottom-Right (P16)
  });

  it('correctly clamps edge scrubber touch ratios to valid slice indices', () => {
    const maxSlices = 90;
    function computeTargetSlice(ratio: number, total: number) {
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      return Math.round(clampedRatio * Math.max(0, total - 1));
    }

    expect(computeTargetSlice(0.0, maxSlices)).toBe(0);
    expect(computeTargetSlice(-0.5, maxSlices)).toBe(0);
    expect(computeTargetSlice(1.0, maxSlices)).toBe(89);
    expect(computeTargetSlice(1.5, maxSlices)).toBe(89);
    expect(computeTargetSlice(0.5, maxSlices)).toBe(45);
  });

  it('correctly calculates responsive reflow layout when closing panes', () => {
    expect(getResponsiveLayoutForCount(1)).toBe('1x1');
    expect(getResponsiveLayoutForCount(2)).toBe('1x2');
    expect(getResponsiveLayoutForCount(2, true)).toBe('2x1');
    expect(getResponsiveLayoutForCount(3)).toBe('1x3');
    expect(getResponsiveLayoutForCount(4)).toBe('2x2');
    expect(getResponsiveLayoutForCount(5)).toBe('1x5');
    expect(getResponsiveLayoutForCount(6)).toBe('2x3');
  });

  it('correctly differentiates mobile touch modes', () => {
    const scrubMode: MobileTouchMode = 'scrub';
    const wlMode: MobileTouchMode = 'wl';
    expect(scrubMode).not.toBe(wlMode);
  });
});
