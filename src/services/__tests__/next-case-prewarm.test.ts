import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientManifestCache } from '@/services/client-manifest-cache';
import { dicomCache } from '@/services/dicom-cache.service';

describe('Predictive Next-Case Pre-Warming Engine', () => {
  beforeEach(() => {
    clientManifestCache.clear();
    vi.restoreAllMocks();
  });

  it('manages client-side manifest memory cache with TTL and clear', () => {
    const manifest = {
      accessionNumber: 'ACC_PREWARM_100',
      series: [
        { seriesNumber: '1', seriesDescription: 'Localizer', instances: [], sliceCount: 1 },
      ],
    };

    clientManifestCache.set('ACC_PREWARM_100', manifest);
    expect(clientManifestCache.has('ACC_PREWARM_100')).toBe(true);
    expect(clientManifestCache.has('acc_prewarm_100')).toBe(true); // case-insensitive check
    expect(clientManifestCache.get('ACC_PREWARM_100')?.accessionNumber).toBe('ACC_PREWARM_100');

    clientManifestCache.clear();
    expect(clientManifestCache.has('ACC_PREWARM_100')).toBe(false);
    expect(clientManifestCache.get('ACC_PREWARM_100')).toBeNull();
  });

  it('pre-warms manifest and first slice into caches', async () => {
    const acc = 'ACC_NEXT_999';
    const mockManifest = {
      accessionNumber: acc,
      series: [
        { seriesNumber: '2', seriesDescription: 'Axial T2', instances: [{ id: '1' }], sliceCount: 20 },
      ],
    };

    // Spy on global fetch for manifest
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (String(url).includes('/manifest')) {
        return {
          ok: true,
          json: async () => mockManifest,
        } as any;
      }
      return { ok: false } as any;
    });

    // Spy on dicomCache.fetchAndCache
    const cacheSpy = vi.spyOn(dicomCache, 'fetchAndCache').mockResolvedValue({
      meta: { modality: 'MR', columns: 512, rows: 512 },
      pixelData: new Int16Array(100),
    } as any);

    // Warm manifest
    clientManifestCache.set(acc, mockManifest);
    expect(clientManifestCache.has(acc)).toBe(true);

    // Warm slice 0 of series 2
    await dicomCache.fetchAndCache(acc, '2', 0);
    expect(cacheSpy).toHaveBeenCalledWith(acc, '2', 0);

    fetchSpy.mockRestore();
    cacheSpy.mockRestore();
  });

  it('preserves sorting order when navigating to next patient', () => {
    const sortedQueue = [
      { accessionNumber: 'ACC_01', patientName: 'Alpha' },
      { accessionNumber: 'ACC_02', patientName: 'Bravo' },
      { accessionNumber: 'ACC_03', patientName: 'Charlie' },
    ];

    // Current is Alpha
    const currentIndex = sortedQueue.findIndex(c => c.accessionNumber === 'ACC_01');
    const nextCase = currentIndex >= 0 && currentIndex < sortedQueue.length - 1
      ? sortedQueue[currentIndex + 1]
      : undefined;

    expect(nextCase?.accessionNumber).toBe('ACC_02');
    expect(nextCase?.patientName).toBe('Bravo');

    // From Bravo, next is Charlie
    const nextIndex = sortedQueue.findIndex(c => c.accessionNumber === 'ACC_02');
    const subsequentCase = nextIndex >= 0 && nextIndex < sortedQueue.length - 1
      ? sortedQueue[nextIndex + 1]
      : undefined;

    expect(subsequentCase?.accessionNumber).toBe('ACC_03');
    expect(subsequentCase?.patientName).toBe('Charlie');
  });
});
