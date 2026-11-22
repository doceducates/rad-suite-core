import { describe, it, expect, beforeEach } from 'vitest';
import { DicomSliceCache, CacheEvent } from '../dicom-cache.service';
import type { ParsedDicomFile } from '../dicom-loader.service';

function createMockSlice(patientId: string): ParsedDicomFile {
  return {
    meta: {
      patientName: 'Test Patient',
      patientId,
      accessionNumber: 'ACC-001',
      modality: 'CT',
      studyDescription: 'CT Abdomen',
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

describe('DicomSliceCache Reactive Streaming & Priority Prefetching', () => {
  let cache: DicomSliceCache;

  beforeEach(() => {
    cache = DicomSliceCache.getInstance();
    cache.clear();
  });

  describe('Event Subscription API', () => {
    it('notifies subscribers with "cached" event when slices are added', () => {
      const events: CacheEvent[] = [];
      const unsub = cache.subscribe((ev) => events.push(ev));

      const mock = createMockSlice('P1');
      cache.set('CASE_01::1::0', mock);
      cache.set('CASE_01::1::1', mock);

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({
        caseId: 'CASE_01',
        series: '1',
        index: 0,
        type: 'cached',
      });
      expect(events[1]).toEqual({
        caseId: 'CASE_01',
        series: '1',
        index: 1,
        type: 'cached',
      });

      unsub();
    });

    it('stops receiving events after unsubscribe is called', () => {
      let callCount = 0;
      const unsub = cache.subscribe(() => {
        callCount++;
      });

      cache.set('CASE_01::1::0', createMockSlice('P1'));
      expect(callCount).toBe(1);

      unsub();

      cache.set('CASE_01::1::1', createMockSlice('P2'));
      expect(callCount).toBe(1);
    });

    it('notifies subscribers with "evicted" event when cache is cleared', () => {
      const mock = createMockSlice('P1');
      cache.set('CASE_01::1::0', mock);
      cache.set('CASE_01::1::1', mock);

      const evictedEvents: CacheEvent[] = [];
      const unsub = cache.subscribe((ev) => {
        if (ev.type === 'evicted') evictedEvents.push(ev);
      });

      cache.clear();

      expect(evictedEvents).toHaveLength(2);
      expect(evictedEvents.map((e) => e.index).sort()).toEqual([0, 1]);
      unsub();
    });

    it('notifies subscribers with "evicted" event when max capacity triggers LRU eviction', () => {
      const evictedEvents: CacheEvent[] = [];
      const unsub = cache.subscribe((ev) => {
        if (ev.type === 'evicted') evictedEvents.push(ev);
      });

      // Max capacity is 120 entries. Adding 121 entries should trigger LRU eviction.
      for (let i = 0; i <= 120; i++) {
        cache.set(`CASE_LRU::1::${i}`, createMockSlice(`P${i}`));
      }

      expect(evictedEvents.length).toBeGreaterThanOrEqual(1);
      expect(evictedEvents[0].caseId).toBe('CASE_LRU');
      expect(evictedEvents[0].series).toBe('1');
      expect(evictedEvents[0].index).toBe(0);
      expect(evictedEvents[0].type).toBe('evicted');

      unsub();
    });
  });

  describe('getCachedSliceIndices & isSliceCached', () => {
    it('returns the exact set of loaded indices for a specific series', () => {
      const mock = createMockSlice('P1');
      cache.set('CASE_01::1::0', mock);
      cache.set('CASE_01::1::5', mock);
      cache.set('CASE_01::1::9', mock);

      // Add slices for different series and different case to verify isolation
      cache.set('CASE_01::2::0', mock);
      cache.set('CASE_02::1::0', mock);

      const indices = cache.getCachedSliceIndices('CASE_01', '1');
      expect(indices.size).toBe(3);
      expect(indices.has(0)).toBe(true);
      expect(indices.has(5)).toBe(true);
      expect(indices.has(9)).toBe(true);
      expect(indices.has(1)).toBe(false);
    });

    it('accurately reports isSliceCached', () => {
      cache.set('CASE_01::1::3', createMockSlice('P1'));
      expect(cache.isSliceCached('CASE_01', '1', 3)).toBe(true);
      expect(cache.isSliceCached('CASE_01', '1', 4)).toBe(false);
      expect(cache.isSliceCached('CASE_01', '2', 3)).toBe(false);
    });
  });

  describe('getSeriesProgress', () => {
    it('calculates loaded slice count, total, and percentage correctly', () => {
      const mock = createMockSlice('P1');
      cache.set('CASE_01::1::0', mock);
      cache.set('CASE_01::1::1', mock);

      const progressHalf = cache.getSeriesProgress('CASE_01', '1', 4);
      expect(progressHalf).toEqual({
        loaded: 2,
        total: 4,
        percent: 50,
      });

      cache.set('CASE_01::1::2', mock);
      const progressThreeFourths = cache.getSeriesProgress('CASE_01', '1', 4);
      expect(progressThreeFourths).toEqual({
        loaded: 3,
        total: 4,
        percent: 75,
      });
    });

    it('handles empty series and zero total slices gracefully', () => {
      const emptyProgress = cache.getSeriesProgress('CASE_01', '1', 10);
      expect(emptyProgress).toEqual({ loaded: 0, total: 10, percent: 0 });

      const zeroTotal = cache.getSeriesProgress('CASE_01', '1', 0);
      expect(zeroTotal).toEqual({ loaded: 0, total: 0, percent: 0 });
    });

    it('resets progress when cache is cleared', () => {
      const mock = createMockSlice('P1');
      cache.set('CASE_01::1::0', mock);
      cache.set('CASE_01::1::1', mock);

      expect(cache.getSeriesProgress('CASE_01', '1', 10).loaded).toBe(2);

      cache.clear();

      const resetProgress = cache.getSeriesProgress('CASE_01', '1', 10);
      expect(resetProgress).toEqual({ loaded: 0, total: 10, percent: 0 });
      expect(cache.getCachedSliceIndices('CASE_01', '1').size).toBe(0);
    });
  });

  describe('Priority Prefetching & Queueing', () => {
    it('schedules prefetch for adjacent and window slices without throwing', () => {
      expect(() => {
        cache.prefetchAdjacent('CASE_01', '1', 5, 20, 2);
        cache.prefetchWindow('CASE_01', '1', 5, 20, 6);
      }).not.toThrow();
    });
  });
});
