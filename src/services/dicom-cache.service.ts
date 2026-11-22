import { ParsedDicomFile, parseDicomBuffer } from './dicom-loader.service';
import { fetchSliceBuffer } from './dicom-slice-fetcher';

export interface CacheEvent {
  caseId: string;
  series: string;
  index: number;
  type: 'cached' | 'evicted';
}

export type CacheListener = (event: CacheEvent) => void;

interface CacheEntry {
  key: string;
  data: ParsedDicomFile;
  timestamp: number;
}

interface PrefetchItem {
  caseId: string;
  series: string;
  index: number;
  filePath?: string;
  priority: number; // 2 = adjacent (high), 3 = background (low)
  distance: number;
}

export class DicomSliceCache {
  private static instance: DicomSliceCache;
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries = 120;
  private pendingFetches = new Map<string, Promise<ParsedDicomFile | null>>();
  private listeners = new Set<CacheListener>();
  private prefetchQueue: PrefetchItem[] = [];
  private activePrefetches = 0;
  private readonly maxConcurrentPrefetches = 2;
  private frameCache = new Map<string, ImageBitmap | HTMLCanvasElement>();

  public getFrame(key: string): ImageBitmap | HTMLCanvasElement | null {
    return this.frameCache.get(key) || null;
  }

  public setFrame(key: string, frame: ImageBitmap | HTMLCanvasElement): void {
    if (this.frameCache.size > 200) {
      const first = this.frameCache.keys().next().value;
      if (first) this.frameCache.delete(first);
    }
    this.frameCache.set(key, frame);
  }

  public static getInstance(): DicomSliceCache {
    if (!DicomSliceCache.instance) DicomSliceCache.instance = new DicomSliceCache();
    return DicomSliceCache.instance;
  }

  public getSliceKey(caseId: string, series: string, index: number): string {
    return `${caseId}::${series}::${index}`;
  }

  public parseSliceKey(key: string): { caseId: string; series: string; index: number } | null {
    const parts = key.split('::');
    if (parts.length < 3) return null;
    const indexStr = parts[parts.length - 1];
    const series = parts[parts.length - 2];
    const caseId = parts.slice(0, parts.length - 2).join('::');
    const index = parseInt(indexStr, 10);
    if (isNaN(index)) return null;
    return { caseId, series, index };
  }

  public subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Suppress listener exceptions to avoid halting cache operations
      }
    }
  }

  public get(key: string): ParsedDicomFile | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    entry.timestamp = Date.now();
    return entry.data;
  }

  public set(key: string, data: ParsedDicomFile): void {
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      this.evictLru();
    }
    this.cache.set(key, { key, data, timestamp: Date.now() });
    const parsed = this.parseSliceKey(key);
    if (parsed) {
      this.notify({ ...parsed, type: 'cached' });
    }
  }

  public isSliceCached(caseId: string, series: string, index: number): boolean {
    return this.cache.has(this.getSliceKey(caseId, series, index));
  }

  public getCachedSliceIndices(caseId: string, series: string): Set<number> {
    const prefix = `${caseId}::${series}::`;
    const indices = new Set<number>();
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        const idx = parseInt(key.slice(prefix.length), 10);
        if (!isNaN(idx)) indices.add(idx);
      }
    }
    return indices;
  }

  public getSeriesProgress(
    caseId: string,
    series: string,
    totalSlices: number
  ): { loaded: number; total: number; percent: number } {
    const total = Math.max(0, totalSlices);
    if (total === 0) return { loaded: 0, total: 0, percent: 0 };
    const loadedIndices = this.getCachedSliceIndices(caseId, series);
    let loaded = 0;
    for (const idx of loadedIndices) {
      if (idx >= 0 && idx < total) loaded++;
    }
    const percent = Math.round((loaded / total) * 100);
    return { loaded, total, percent };
  }

  private evictLru(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of this.cache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
      const parsed = this.parseSliceKey(oldestKey);
      if (parsed) this.notify({ ...parsed, type: 'evicted' });
    }
  }

  public async fetchAndCache(
    caseId: string,
    series: string,
    index: number,
    filePath?: string
  ): Promise<ParsedDicomFile | null> {
    const key = this.getSliceKey(caseId, series, index);
    const existing = this.get(key);
    if (existing) return existing;

    const inFlight = this.pendingFetches.get(key);
    if (inFlight) return inFlight;

    const fetchPromise = (async () => {
      try {
        const buf = await fetchSliceBuffer(caseId, series, index, filePath);
        if (!buf) return null;
        const parsed = parseDicomBuffer(buf);
        this.set(key, parsed);
        return parsed;
      } catch {
        return null;
      } finally {
        this.pendingFetches.delete(key);
      }
    })();

    this.pendingFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  public prefetchAdjacent(
    caseId: string,
    series: string,
    currentIndex: number,
    totalSlices: number,
    radius = 2,
    files?: string[]
  ): void {
    this.queuePrefetchIndices(caseId, series, currentIndex, totalSlices, radius, 2, files);
  }

  public prefetchWindow(
    caseId: string,
    series: string,
    currentIndex: number,
    totalSlices: number,
    windowSize = 6,
    files?: string[]
  ): void {
    this.queuePrefetchIndices(caseId, series, currentIndex, totalSlices, windowSize, 3, files);
  }

  private queuePrefetchIndices(
    caseId: string,
    series: string,
    currentIndex: number,
    totalSlices: number,
    maxDistance: number,
    basePriority: number,
    files?: string[]
  ): void {
    for (let d = 1; d <= maxDistance; d++) {
      const priority = d <= 2 ? 2 : basePriority;
      const candidates = [currentIndex + d, currentIndex - d];

      for (const idx of candidates) {
        if (idx < 0 || idx >= totalSlices) continue;
        const key = this.getSliceKey(caseId, series, idx);
        if (this.cache.has(key) || this.pendingFetches.has(key)) continue;

        const alreadyQueued = this.prefetchQueue.some(
          (q) => q.caseId === caseId && q.series === series && q.index === idx
        );
        if (!alreadyQueued) {
          this.prefetchQueue.push({
            caseId,
            series,
            index: idx,
            filePath: files?.[idx],
            priority,
            distance: d,
          });
        }
      }
    }

    this.prefetchQueue.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distance - b.distance;
    });

    if (this.prefetchQueue.length > 32) {
      this.prefetchQueue = this.prefetchQueue.slice(0, 32);
    }

    this.processPrefetchQueue();
  }

  private processPrefetchQueue(): void {
    while (this.activePrefetches < this.maxConcurrentPrefetches && this.prefetchQueue.length > 0) {
      const item = this.prefetchQueue.shift();
      if (!item) break;

      const key = this.getSliceKey(item.caseId, item.series, item.index);
      if (this.cache.has(key) || this.pendingFetches.has(key)) continue;

      this.activePrefetches++;
      this.fetchAndCache(item.caseId, item.series, item.index, item.filePath)
        .catch(() => {})
        .finally(() => {
          this.activePrefetches--;
          this.processPrefetchQueue();
        });
    }
  }

  public clear(): void {
    const evicted: CacheEvent[] = [];
    for (const key of this.cache.keys()) {
      const parsed = this.parseSliceKey(key);
      if (parsed) evicted.push({ ...parsed, type: 'evicted' });
    }
    this.cache.clear();
    this.pendingFetches.clear();
    this.prefetchQueue = [];
    this.activePrefetches = 0;
    for (const ev of evicted) {
      this.notify(ev);
    }
  }
}

export const dicomCache = DicomSliceCache.getInstance();
