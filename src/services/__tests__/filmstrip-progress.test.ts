// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { dicomCache } from '@/services/dicom-cache.service';
import type { ParsedDicomFile } from '@/services/dicom-loader.service';
import {
  resolveSeriesOrientation,
  resolveOrientationBadge,
  getSeriesProgressSnapshot,
  useSeriesProgress,
  SeriesProgress,
} from '@/hooks/use-series-progress';
import { StitchFilmstrip } from '@/components/workstation/stitch-filmstrip';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function createMockSlice(idx: number): ParsedDicomFile {
  return {
    meta: {
      patientName: 'Test Patient',
      patientId: `P-${idx}`,
      accessionNumber: 'ACC-TEST',
      modality: 'CT',
      studyDescription: 'CT Chest',
      rows: 512,
      columns: 512,
      windowWidth: 400,
      windowCenter: 40,
      rescaleSlope: 1,
      rescaleIntercept: 0,
      bitsAllocated: 16,
      pixelRepresentation: 0,
      photometricInterpretation: 'MONOCHROME2',
      pixelSpacing: [1, 1],
    },
    pixelData: new Int16Array(10),
  };
}

describe('Filmstrip & Rails Sequence Progress & Orientation Badges', () => {
  beforeEach(() => {
    dicomCache.clear();
  });

  describe('1. Orientation Badge Resolver', () => {
    it('correctly maps explicit and heuristic orientations to labels and themes', () => {
      const cases: [string | undefined, string | undefined, string, string, string][] = [
        ['SAGITTAL', undefined, 'SAGITTAL', 'SAG', 'purple'],
        ['sagittal', undefined, 'SAGITTAL', 'SAG', 'purple'],
        ['CORONAL', undefined, 'CORONAL', 'COR', 'amber'],
        ['coronal', undefined, 'CORONAL', 'COR', 'amber'],
        ['AXIAL', undefined, 'AXIAL', 'AX', 'sky'],
        ['axial', undefined, 'AXIAL', 'AX', 'sky'],
        ['LOCALIZER', undefined, 'LOCALIZER', 'LOC', 'emerald'],
        ['SCOUT', undefined, 'LOCALIZER', 'LOC', 'emerald'],
        ['TOPOGRAM', undefined, 'LOCALIZER', 'LOC', 'emerald'],
        [undefined, '3-Plane Localizer', 'LOCALIZER', 'LOC', 'emerald'],
        [undefined, 'CT Scout AP', 'LOCALIZER', 'LOC', 'emerald'],
        [undefined, 'Sagittal T2 FSE', 'SAGITTAL', 'SAG', 'purple'],
        [undefined, 'Coronal STIR', 'CORONAL', 'COR', 'amber'],
        [undefined, 'Axial Soft Tissue', 'AXIAL', 'AX', 'sky'],
        [undefined, undefined, 'AXIAL', 'AX', 'sky'],
        ['', '', 'AXIAL', 'AX', 'sky'],
      ];

      for (const [orient, desc, expType, expLabel, expColor] of cases) {
        expect(resolveSeriesOrientation(orient, desc)).toBe(expType);
        const badge = resolveOrientationBadge(orient, desc);
        expect(badge.label).toBe(expLabel);
        expect(badge.badgeClassName).toContain(expColor);
      }
    });
  });

  describe('2. Series Progress Snapshot Logic', () => {
    it('prevents premature 100% completion on uninitialized metadata (0 total slices)', () => {
      const snap = getSeriesProgressSnapshot('CASE_1', '1', 0);
      expect(snap).toEqual({ loaded: 0, total: 0, percent: 0, isComplete: false });
      expect(snap.isComplete).toBe(false);
    });

    it('handles empty case or series gracefully', () => {
      expect(getSeriesProgressSnapshot(undefined, '1', 10)).toEqual({
        loaded: 0, total: 10, percent: 0, isComplete: false,
      });
      expect(getSeriesProgressSnapshot('CASE_1', undefined, 10)).toEqual({
        loaded: 0, total: 10, percent: 0, isComplete: false,
      });
    });

    it('accurately computes partial progress (4/14 slices)', () => {
      const caseId = 'CASE_PARTIAL';
      for (let i = 0; i < 4; i++) {
        dicomCache.set(`${caseId}::1::${i}`, createMockSlice(i));
      }
      const progress = getSeriesProgressSnapshot(caseId, '1', 14);
      expect(progress).toEqual({ loaded: 4, total: 14, percent: 29, isComplete: false });
    });

    it('accurately computes complete progress (12/12 slices)', () => {
      const caseId = 'CASE_FULL';
      for (let i = 0; i < 12; i++) {
        dicomCache.set(`${caseId}::2::${i}`, createMockSlice(i));
      }
      const progress = getSeriesProgressSnapshot(caseId, '2', 12);
      expect(progress).toEqual({ loaded: 12, total: 12, percent: 100, isComplete: true });
    });
  });

  describe('3. Reactive useSeriesProgress Hook & Event Isolation', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(() => {
      act(() => { root.unmount(); });
      container.remove();
    });

    it('subscribes dynamically and ignores events from other series or cases', () => {
      const caseId = 'CASE_ISOLATION';
      let progress1: SeriesProgress | null = null;

      function TestHarness() {
        progress1 = useSeriesProgress(caseId, '1', 10);
        return React.createElement('div', null, `${progress1.loaded}/${progress1.total}`);
      }

      act(() => { root.render(React.createElement(TestHarness)); });
      expect(progress1).toEqual({ loaded: 0, total: 10, percent: 0, isComplete: false });

      // Cache slices for another series (series 2) and another case
      act(() => {
        dicomCache.set(`${caseId}::2::0`, createMockSlice(0));
        dicomCache.set(`OTHER_CASE::1::0`, createMockSlice(0));
      });
      // Series 1 should remain unaffected
      expect(progress1).toEqual({ loaded: 0, total: 10, percent: 0, isComplete: false });

      // Cache slices for series 1
      act(() => {
        for (let i = 0; i < 5; i++) {
          dicomCache.set(`${caseId}::1::${i}`, createMockSlice(i));
        }
      });
      expect(progress1).toEqual({ loaded: 5, total: 10, percent: 50, isComplete: false });

      // Cache remaining slices to reach 100%
      act(() => {
        for (let i = 5; i < 10; i++) {
          dicomCache.set(`${caseId}::1::${i}`, createMockSlice(i));
        }
      });
      expect(progress1).toEqual({ loaded: 10, total: 10, percent: 100, isComplete: true });

      // Cache clear resets series 1
      act(() => { dicomCache.clear(); });
      expect(progress1).toEqual({ loaded: 0, total: 10, percent: 0, isComplete: false });
    });
  });

  describe('4. Component Render & Accessibility Standards', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(() => {
      act(() => { root.unmount(); });
      container.remove();
    });

    it('renders aria-pressed, descriptive aria-label, orientation badge and omits fallback thickness', () => {
      const seriesList = [
        {
          seriesNumber: '1',
          seriesDescription: 'Localizer 3-Plane',
          orientation: 'LOCALIZER',
          sliceCount: 3,
        },
        {
          seriesNumber: '2',
          seriesDescription: 'Axial Brain',
          orientation: 'AXIAL',
          sliceCount: 24,
          sliceThickness: '2.5mm',
        },
      ];

      act(() => {
        root.render(
          React.createElement(StitchFilmstrip, {
            seriesList,
            activeSeriesIndex: 0,
            onSelectSeries: () => {},
            localCaseId: 'CASE_A11Y',
          })
        );
      });

      const buttons = container.querySelectorAll('[role="button"]');
      expect(buttons.length).toBe(2);

      // First series is selected (aria-pressed=true)
      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[0].getAttribute('aria-label')).toContain('Series 1: Localizer 3-Plane');
      expect(buttons[0].textContent).toContain('LOC');
      // No sliceThickness provided -> no hardcoded '1.25mm' fallback!
      expect(buttons[0].textContent).not.toContain('1.25mm');

      // Second series is unselected (aria-pressed=false)
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[1].textContent).toContain('AX');
      expect(buttons[1].textContent).toContain('2.5mm');
    });
  });
});
