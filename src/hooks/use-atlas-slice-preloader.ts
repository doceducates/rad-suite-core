'use client';

// Layer 4: Atlas Paced 20-Slice Streaming Preloader & Ring Buffer (<220 lines)
import { useEffect, useRef, useCallback } from 'react';
import { getAtlasMaxCacheCapacity, isAtlasDataSaverEnabled } from '@/lib/atlas-cache';

interface UseAtlasSlicePreloaderOptions {
  moduleCode: string;
  seriesId: number;
  currentSliceSort: number;
  totalSlices: number;
  activeLayerName?: string | null;
  lookaroundRadius?: number;
}

export function useAtlasSlicePreloader({
  moduleCode,
  seriesId,
  currentSliceSort,
  totalSlices,
  activeLayerName,
  lookaroundRadius = 10,
}: UseAtlasSlicePreloaderOptions) {
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const maskCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const lastDirectionRef = useRef<number>(1);
  const prevSliceRef = useRef<number>(currentSliceSort);
  const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Evict slices furthest from current index to keep RAM lightweight
  const pruneCache = useCallback((cache: Map<number, HTMLImageElement>, current: number) => {
    const maxCapacity = Math.max(48, getAtlasMaxCacheCapacity());
    if (cache.size <= maxCapacity) return;
    const entries = Array.from(cache.keys()).sort(
      (a, b) => Math.abs(b - current) - Math.abs(a - current)
    );
    while (cache.size > maxCapacity && entries.length > 0) {
      const furthest = entries.shift();
      if (furthest !== undefined) {
        cache.delete(furthest);
      }
    }
  }, []);

  // Preload a single slice with off-thread decoding — uses standard browser HTTP disk cache
  const preloadSlice = useCallback(
    (sliceSort: number): HTMLImageElement | null => {
      if (!moduleCode || !seriesId || sliceSort < 1 || sliceSort > totalSlices) return null;
      const existing = imageCacheRef.current.get(sliceSort);
      if (existing) return existing;

      const url = `/api/anatomy/image?module=${moduleCode}&series=${seriesId}&slice=${sliceSort}`;
      const img = new Image();
      if ('fetchPriority' in img) {
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
      }
      img.src = url;

      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }

      imageCacheRef.current.set(sliceSort, img);
      return img;
    },
    [moduleCode, seriesId, totalSlices]
  );

  // Preload a single mask layer
  const preloadMask = useCallback(
    (sliceSort: number, layer: string): HTMLImageElement | null => {
      if (!moduleCode || !layer || sliceSort < 1 || sliceSort > totalSlices) return null;
      const existing = maskCacheRef.current.get(sliceSort);
      if (existing) return existing;

      const url = `/api/anatomy/mask?module=${moduleCode}&layer=${layer}&slice=${sliceSort}&globalSlice=${sliceSort}`;
      const img = new Image();
      if ('fetchPriority' in img) {
        (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
      }
      img.src = url;

      if (typeof img.decode === 'function') {
        img.decode().catch(() => {});
      }
      maskCacheRef.current.set(sliceSort, img);
      return img;
    },
    [moduleCode, totalSlices]
  );

  // Clear memory cache when series or module switches
  useEffect(() => {
    imageCacheRef.current.clear();
    maskCacheRef.current.clear();
  }, [moduleCode, seriesId]);

  // Clear mask cache when active layer toggles
  useEffect(() => {
    maskCacheRef.current.clear();
  }, [activeLayerName]);

  // Track velocity and scrubbing direction (forward vs backward)
  useEffect(() => {
    if (currentSliceSort !== prevSliceRef.current) {
      lastDirectionRef.current = currentSliceSort >= prevSliceRef.current ? 1 : -1;
      prevSliceRef.current = currentSliceSort;
    }
  }, [currentSliceSort]);

  // Paced Streaming Queue: Immediate buffer (+1, -1) followed by sequential background fill (+2..+10, -2..-10)
  useEffect(() => {
    if (!moduleCode || !seriesId || totalSlices <= 0) return;

    // Clear any previous queued background streaming
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }

    const isDataSaver = isAtlasDataSaverEnabled();
    const dir = lastDirectionRef.current;
    const maxRadius = isDataSaver ? 2 : Math.min(12, Math.max(3, lookaroundRadius));

    // Tier 1: Immediate adjacent slices (+1 in motion direction, -1 trailing)
    const immediateForward = currentSliceSort + dir;
    const immediateBackward = currentSliceSort - dir;
    if (immediateForward >= 1 && immediateForward <= totalSlices) {
      preloadSlice(immediateForward);
      if (activeLayerName) preloadMask(immediateForward, activeLayerName);
    }
    if (immediateBackward >= 1 && immediateBackward <= totalSlices) {
      preloadSlice(immediateBackward);
      if (activeLayerName) preloadMask(immediateBackward, activeLayerName);
    }

    pruneCache(imageCacheRef.current, currentSliceSort);
    if (activeLayerName) pruneCache(maskCacheRef.current, currentSliceSort);

    if (isDataSaver) return;

    // Tier 2: Build outward priority sequence (+2, -2, +3, -3, ... up to maxRadius)
    const backgroundQueue: number[] = [];
    for (let dist = 2; dist <= maxRadius; dist++) {
      const f = currentSliceSort + dist * dir;
      const b = currentSliceSort - dist * dir;
      if (f >= 1 && f <= totalSlices && !imageCacheRef.current.has(f)) backgroundQueue.push(f);
      if (b >= 1 && b <= totalSlices && !imageCacheRef.current.has(b)) backgroundQueue.push(b);
    }

    // Process background queue one slice at a time with 40ms yield to protect active network traffic
    let queueIndex = 0;
    const streamNext = () => {
      if (queueIndex >= backgroundQueue.length) return;
      const target = backgroundQueue[queueIndex++];
      preloadSlice(target);
      if (activeLayerName) preloadMask(target, activeLayerName);
      pruneCache(imageCacheRef.current, currentSliceSort);

      // Paced cadence (40ms spacing prevents browser connection queue congestion)
      queueTimeoutRef.current = setTimeout(streamNext, 40);
    };

    // Delay start of background stream by 80ms so initial active slice renders first
    queueTimeoutRef.current = setTimeout(streamNext, 80);

    return () => {
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
        queueTimeoutRef.current = null;
      }
    };
  }, [
    moduleCode,
    seriesId,
    currentSliceSort,
    totalSlices,
    activeLayerName,
    lookaroundRadius,
    preloadSlice,
    preloadMask,
    pruneCache,
  ]);

  const isSliceReady = useCallback((sliceSort: number) => {
    const cached = imageCacheRef.current.get(sliceSort);
    return Boolean(cached && cached.complete);
  }, []);

  return {
    isSliceReady,
    imageCache: imageCacheRef,
    maskCache: maskCacheRef,
  };
}
