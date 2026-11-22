'use client';

import { useState, useEffect, useRef } from 'react';
import { ParsedDicomFile } from '@/services/dicom-loader.service';
import { dicomCache } from '@/services/dicom-cache.service';
import { fetchSliceBuffer } from '@/services/dicom-slice-fetcher';
import { parseDicomAsync } from '@/services/dicom-worker-client';
import { getAutoWlForSeries } from '@/services/dicom-wl-presets.service';
import { computeAdaptiveMrWindow } from '@/services/clinical-presets.service';

interface UseDicomSliceLoaderOptions {
  isRealDcm: boolean;
  localCaseId?: string;
  currentSeries: any;
  slice: number;
  setWw: (w: number) => void;
  setWc: (c: number) => void;
}

export function useDicomSliceLoader({
  isRealDcm,
  localCaseId,
  currentSeries,
  slice,
  setWw,
  setWc,
}: UseDicomSliceLoaderOptions) {
  const [parsedSlice, setParsedSlice] = useState<ParsedDicomFile | null>(null);
  const lastInitializedSeriesRef = useRef<string | null>(null);
  const defaultWlRef = useRef<{ ww: number; wc: number } | null>(null);

  const sNum = currentSeries?.seriesNumber || '1';
  const totalSlices = currentSeries?.sliceCount || currentSeries?.instances?.length || 24;
  const sliceKey = localCaseId ? dicomCache.getSliceKey(localCaseId, sNum, slice) : `slice_${slice}`;

  useEffect(() => {
    if (!isRealDcm || !localCaseId) return;

    let cancelled = false;
    const abortController = new AbortController();
    const files = currentSeries?.files;
    const filePath = files?.[slice];

    const triggerPrefetch = () => {
      if (!localCaseId || cancelled) return;
      // Priority 2: Immediate adjacent slices (±2) for smooth mouse wheel scrubbing
      dicomCache.prefetchAdjacent(localCaseId, sNum, slice, totalSlices, 2, files);
      // Priority 3: Background window prefetch for the rest of the series
      dicomCache.prefetchWindow(localCaseId, sNum, slice, totalSlices, 6, files);
    };

    function syncDefaultWl(data: ParsedDicomFile) {
      if (lastInitializedSeriesRef.current !== sNum) {
        lastInitializedSeriesRef.current = sNum;
        const mod = (currentSeries?.modality || data.meta.modality || '').toUpperCase();
        const isMr = mod === 'MR' || mod === 'MRI';
        const hasDummyHeader = (data.meta.windowWidth ?? 0) >= 8191;

        if (isMr && data.pixelData && (hasDummyHeader || !data.meta.windowWidth)) {
          const adaptive = computeAdaptiveMrWindow(data.pixelData, {
            seriesDescription: currentSeries?.seriesDescription || currentSeries?.description || data.meta.seriesDescription,
            protocolName: data.meta.protocolName,
            sequenceName: data.meta.sequenceName,
            inversionTime: data.meta.inversionTime,
            repetitionTime: data.meta.repetitionTime,
            echoTime: data.meta.echoTime,
            modality: mod,
          });
          setWw(adaptive.ww);
          setWc(adaptive.wc);
          defaultWlRef.current = { ww: adaptive.ww, wc: adaptive.wc };
        } else {
          const autoWl = getAutoWlForSeries({
            seriesDescription: currentSeries?.seriesDescription || currentSeries?.description || data.meta.seriesDescription,
            protocolName: data.meta.protocolName,
            sequenceName: data.meta.sequenceName,
            inversionTime: data.meta.inversionTime,
            repetitionTime: data.meta.repetitionTime,
            echoTime: data.meta.echoTime,
            modality: mod,
            headerWw: data.meta.windowWidth,
            headerWc: data.meta.windowCenter,
          });
          setWw(autoWl.ww);
          setWc(autoWl.wc);
          defaultWlRef.current = { ww: autoWl.ww, wc: autoWl.wc };
        }
      }
    }

    // Subscribe to cache streaming events: if slice arrives via prefetch, render immediately
    const unsubscribeCache = dicomCache.subscribe((event) => {
      if (
        event.type === 'cached' &&
        event.caseId === localCaseId &&
        event.series === sNum &&
        event.index === slice
      ) {
        const cached = dicomCache.get(sliceKey);
        if (cached && !cancelled) {
          setParsedSlice(cached);
          syncDefaultWl(cached);
          triggerPrefetch();
        }
      }
    });

    // Check if current slice is already cached (instant cache hit)
    const cached = dicomCache.get(sliceKey);
    if (cached) {
      setParsedSlice(cached);
      syncDefaultWl(cached);
      triggerPrefetch();
      return () => {
        cancelled = true;
        abortController.abort();
        unsubscribeCache();
      };
    }

    // Priority 1: Active visible slice requested immediately with highest priority
    fetchSliceBuffer(localCaseId, sNum, slice, filePath, abortController.signal)
      .then(async (buf) => {
        if (!buf || cancelled) return;
        const parsed = await parseDicomAsync(buf);
        if (cancelled) return;

        dicomCache.set(sliceKey, parsed);
        setParsedSlice(parsed);
        syncDefaultWl(parsed);

        // Once current slice resolves, trigger adjacent prefetch (±2) immediately, then background window
        triggerPrefetch();
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          // Silently handle aborts
        }
      });

    return () => {
      cancelled = true;
      abortController.abort();
      unsubscribeCache();
    };
  }, [isRealDcm, localCaseId, sNum, slice, sliceKey, totalSlices, setWw, setWc]);

  return { parsedSlice, sliceKey, defaultWl: defaultWlRef.current };
}
