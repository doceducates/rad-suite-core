// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { dicomCache } from '@/services/dicom-cache.service';
import type { ParsedDicomFile } from '@/services/dicom-loader.service';
import { resolveOrientationBadge } from '@/hooks/use-series-progress';
import { computeScrubberBuffer } from '@/services/smart-scrubber.service';
import { ZenDicomScrubber } from '@/components/workstation/zen-dicom-scrubber';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockSlice = (idx: number): ParsedDicomFile => ({
  meta: {
    patientName: 'Test Patient', patientId: `P-${idx}`, accessionNumber: 'ACC-SCRUB',
    studyDescription: 'CT Chest', modality: 'CT', rows: 512, columns: 512,
    windowWidth: 400, windowCenter: 40, rescaleSlope: 1, rescaleIntercept: 0,
    bitsAllocated: 16, pixelRepresentation: 0, photometricInterpretation: 'MONOCHROME2',
    pixelSpacing: [1, 1],
  },
  pixelData: new Int16Array(10),
});

describe('Decluttered DICOM Scrubber & Buffer Engine', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    dicomCache.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) { act(() => { root?.unmount(); }); root = null; }
    if (container?.parentNode) { container.parentNode.removeChild(container); container = null; }
    dicomCache.clear();
  });

  describe('1. Scrubber Buffer Calculation Logic', () => {
    it('handles zero or negative slice counts gracefully', () => {
      expect(computeScrubberBuffer(new Set([0, 1]), 0)).toEqual({
        loadedCount: 0, totalCount: 0, percent: 0, isComplete: false,
        missingIndices: [], loadedIndices: [], loadedRanges: [],
      });
      expect(computeScrubberBuffer(new Set([0]), -5).isComplete).toBe(false);
    });

    it('computes partial cache and identifies missing slice intervals (4/14 slices)', () => {
      const res = computeScrubberBuffer(new Set([0, 1, 2, 3]), 14);
      expect(res.loadedCount).toBe(4);
      expect(res.totalCount).toBe(14);
      expect(res.percent).toBe(29);
      expect(res.isComplete).toBe(false);
      expect(res.loadedIndices).toEqual([0, 1, 2, 3]);
      expect(res.missingIndices).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
      expect(res.loadedRanges).toEqual([{ start: 0, end: 3 }]);
    });

    it('computes contiguous loaded ranges across gaps and handles 500 slices efficiently', () => {
      const resGaps = computeScrubberBuffer(new Set([0, 1, 2, 5, 6]), 10);
      expect(resGaps.loadedRanges).toEqual([{ start: 0, end: 2 }, { start: 5, end: 6 }]);

      const cached500 = new Set<number>();
      for (let i = 100; i <= 249; i++) cached500.add(i);
      const res500 = computeScrubberBuffer(cached500, 500);
      expect(res500.loadedCount).toBe(150);
      expect(res500.totalCount).toBe(500);
      expect(res500.percent).toBe(30);
      expect(res500.loadedRanges).toEqual([{ start: 100, end: 249 }]);
    });

    it('identifies 100% completion when all slices are present (12/12 slices)', () => {
      const res = computeScrubberBuffer(new Set(Array.from({ length: 12 }, (_, i) => i)), 12);
      expect(res.loadedCount).toBe(12);
      expect(res.percent).toBe(100);
      expect(res.isComplete).toBe(true);
      expect(res.loadedRanges).toEqual([{ start: 0, end: 11 }]);
    });

    it('filters out-of-range indices from loaded count', () => {
      const res = computeScrubberBuffer(new Set([-1, 0, 2, 99]), 5);
      expect(res.loadedCount).toBe(2);
      expect(res.loadedIndices).toEqual([0, 2]);
      expect(res.loadedRanges).toEqual([{ start: 0, end: 0 }, { start: 2, end: 2 }]);
    });
  });

  describe('2. Orientation Badge Mapping Service', () => {
    it('maps orientation tags to compact badge labels and theme tokens', () => {
      const expectations: [string, string, string][] = [
        ['AXIAL', 'AX', 'sky'], ['SAGITTAL', 'SAG', 'purple'],
        ['CORONAL', 'COR', 'amber'], ['LOCALIZER', 'LOC', 'emerald'],
      ];
      for (const [orient, label, color] of expectations) {
        const badge = resolveOrientationBadge(orient);
        expect(badge.label).toBe(label);
        expect(badge.badgeClassName).toContain(color);
      }
    });
  });

  describe('3. Decluttered Scrubber UX: ARIA Attributes & Navigation', () => {
    it('verifies ARIA slider accessibility attributes and min/max boundaries', () => {
      act(() => {
        root?.render(
          React.createElement(ZenDicomScrubber, {
            seriesNumber: 1, slice: 3, maxSlices: 15, onSliceChange: vi.fn(),
          })
        );
      });
      const slider = container?.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider.getAttribute('role')).toBe('slider');
      expect(slider.getAttribute('aria-label')).toBe('DICOM slice scrubber');
      expect(slider.getAttribute('aria-valuenow')).toBe('4');
      expect(slider.getAttribute('aria-valuemin')).toBe('1');
      expect(slider.getAttribute('aria-valuemax')).toBe('15');
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('14');
    });

    it('supports keyboard and click navigation on step buttons', () => {
      const onChange = vi.fn();
      act(() => {
        root?.render(
          React.createElement(ZenDicomScrubber, {
            seriesNumber: 1, slice: 5, maxSlices: 10, onSliceChange: onChange,
          })
        );
      });
      const prev = container?.querySelector('button[title*="Previous Slice"]') as HTMLButtonElement;
      const next = container?.querySelector('button[title*="Next Slice"]') as HTMLButtonElement;

      act(() => { prev.click(); });
      expect(onChange).toHaveBeenCalledWith(4);

      act(() => { next.click(); });
      expect(onChange).toHaveBeenCalledWith(6);
    });

    it('ensures decluttered layout has no redundant series badges or duplicate buffer tracks', () => {
      act(() => {
        root?.render(
          React.createElement(ZenDicomScrubber, {
            seriesNumber: 1, slice: 0, maxSlices: 12, onSliceChange: vi.fn(),
          })
        );
      });

      // Redundant clutter must be absent
      const seriesBadge = container?.querySelector('[data-testid="series-badge"]');
      const bufferTrack = container?.querySelector('[data-testid="buffer-track"]');
      const counterBadge = container?.querySelector('[data-testid="buffer-counter-badge"]');

      expect(seriesBadge).toBeNull();
      expect(bufferTrack).toBeNull();
      expect(counterBadge).toBeNull();
    });
  });
});
