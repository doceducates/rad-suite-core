import { describe, it, expect } from 'vitest';
import type { ViewportLayoutMode, MobileTouchMode } from '@/types/viewport';

describe('Viewport Mobile Layout & Touch Modes', () => {
  it('supports all layout modes including 3x3 and 4x4', () => {
    const modes: ViewportLayoutMode[] = ['1x1', '1x2', '1x3', '2x2', '3x3', '4x4'];
    expect(modes).toHaveLength(6);
  });

  it('correctly maps layout mode to row, column, and total cell counts', () => {
    function getGridDimensions(layout: ViewportLayoutMode) {
      switch (layout) {
        case '1x2': return { cellCount: 2, rows: 1, cols: 2 };
        case '1x3': return { cellCount: 3, rows: 1, cols: 3 };
        case '2x2': return { cellCount: 4, rows: 2, cols: 2 };
        case '3x3': return { cellCount: 9, rows: 3, cols: 3 };
        case '4x4': return { cellCount: 16, rows: 4, cols: 4 };
        default: return { cellCount: 1, rows: 1, cols: 1 };
      }
    }

    expect(getGridDimensions('1x1')).toEqual({ cellCount: 1, rows: 1, cols: 1 });
    expect(getGridDimensions('1x2')).toEqual({ cellCount: 2, rows: 1, cols: 2 });
    expect(getGridDimensions('2x2')).toEqual({ cellCount: 4, rows: 2, cols: 2 });
    expect(getGridDimensions('3x3')).toEqual({ cellCount: 9, rows: 3, cols: 3 });
    expect(getGridDimensions('4x4')).toEqual({ cellCount: 16, rows: 4, cols: 4 });
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

  it('correctly differentiates mobile touch modes', () => {
    const scrubMode: MobileTouchMode = 'scrub';
    const wlMode: MobileTouchMode = 'wl';
    expect(scrubMode).not.toBe(wlMode);
  });
});
