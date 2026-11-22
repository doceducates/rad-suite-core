'use client';

import { useState, useCallback, useRef } from 'react';

interface UseOrientationSyncOptions {
  totalPanes: number;
  activeCellIndex: number;
  syncScroll?: boolean;
  getAssignedSeries: (paneIdx: number) => any[];
  getPaneOrientation: (paneIdx: number) => 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  onFocusPane: (paneIdx: number) => void;
}

export function useOrientationSync({
  totalPanes,
  activeCellIndex,
  syncScroll = true,
  getAssignedSeries,
  getPaneOrientation,
  onFocusPane,
}: UseOrientationSyncOptions) {
  const [orientationProgress, setOrientationProgress] = useState<Record<string, number>>({
    AXIAL: 0,
    SAGITTAL: 0.5,
    CORONAL: 0.5,
  });
  const [paneDirectSlice, setPaneDirectSlice] = useState<Record<number, number | undefined>>({});
  const lastScrolledPaneRef = useRef<number | null>(null);

  const activeOrientation = getPaneOrientation(activeCellIndex);

  const handleSliceChange = useCallback(
    (paneIdx: number, sl: number, total: number) => {
      lastScrolledPaneRef.current = paneIdx;
      setPaneDirectSlice((prev) => (Object.keys(prev).length > 0 ? {} : prev));
      if (total > 1) {
        const orient = getPaneOrientation(paneIdx);
        const newProgress = sl / (total - 1);
        setOrientationProgress((prev) => (prev[orient] === newProgress ? prev : { ...prev, [orient]: newProgress }));
      }
      if (paneIdx !== activeCellIndex) {
        onFocusPane(paneIdx);
      }
    },
    [activeCellIndex, getPaneOrientation, onFocusPane]
  );

  const handleSelectScoutSlice = useCallback(
    (sourceSeriesNum: string | number, sliceIdx: number) => {
      for (let i = 0; i < totalPanes; i++) {
        const series = getAssignedSeries(i);
        if (series[0] && String(series[0].seriesNumber) === String(sourceSeriesNum)) {
          const orient = series[0].orientation || 'AXIAL';
          const count = series[0].sliceCount || 32;
          const newProg = count > 1 ? sliceIdx / (count - 1) : 0;
          setOrientationProgress((prev) => (prev[orient] === newProg ? prev : { ...prev, [orient]: newProg }));
          setPaneDirectSlice((prev) => ({ ...prev, [i]: sliceIdx }));
          lastScrolledPaneRef.current = null;
          onFocusPane(i);
          break;
        }
      }
    },
    [totalPanes, getAssignedSeries, onFocusPane]
  );

  const clearDirectSlice = useCallback((paneIdx: number) => {
    setPaneDirectSlice((prev) => (prev[paneIdx] !== undefined ? { ...prev, [paneIdx]: undefined } : prev));
  }, []);

  const jumpPanesToSlices = useCallback((targets: Record<number, number>) => {
    lastScrolledPaneRef.current = null;

    setOrientationProgress((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const [pIdxStr, sliceIdx] of Object.entries(targets)) {
        const pIdx = parseInt(pIdxStr, 10);
        const orient = getPaneOrientation(pIdx);
        const seriesList = getAssignedSeries(pIdx);
        if (seriesList && seriesList.length > 0) {
          const sliceCount = seriesList[0].sliceCount || 1;
          const newProg = sliceCount > 1 ? sliceIdx / (sliceCount - 1) : 0;
          if (updated[orient] !== newProg) {
            updated[orient] = newProg;
            changed = true;
          }
        }
      }
      return changed ? updated : prev;
    });

    setPaneDirectSlice((prev) => ({ ...prev, ...targets }));
  }, [getPaneOrientation, getAssignedSeries]);

  const getExternalSlice = useCallback(
    (idx: number, sCount: number) => {
      if (idx === lastScrolledPaneRef.current || idx === activeCellIndex) {
        return paneDirectSlice[idx];
      }
      if (paneDirectSlice[idx] !== undefined) {
        return paneDirectSlice[idx];
      }
      const paneOrient = getPaneOrientation(idx);
      if (syncScroll && paneOrient === activeOrientation) {
        const progress = orientationProgress[paneOrient] ?? 0;
        return Math.round(progress * (sCount - 1));
      }
      return undefined;
    },
    [paneDirectSlice, syncScroll, activeCellIndex, activeOrientation, getPaneOrientation, orientationProgress]
  );

  return {
    activeOrientation,
    handleSliceChange,
    handleSelectScoutSlice,
    clearDirectSlice,
    getExternalSlice,
    jumpPanesToSlices,
  };
}
