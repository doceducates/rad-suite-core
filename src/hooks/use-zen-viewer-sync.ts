'use client';

import { useEffect, useRef, useMemo } from 'react';
import { WINDOW_PRESETS } from '@/services/dicom.service';
import { SliceGeometry, getOrientationFromIop, detectOrientationFromDescription } from '@/services/dicom-geometry.service';
import type { ParsedDicomFile } from '@/services/dicom-loader.service';

interface UseZenViewerSyncOptions {
  slice: number;
  maxSlices: number;
  setSlice: (s: number | ((p: number) => number)) => void;
  externalSlice?: number;
  activeSeriesIndex: number;
  preset: string;
  setWw: (w: number) => void;
  setWc: (c: number) => void;
  resetKey?: number;
  resetViewport: () => void;
  defaultWl: { ww: number; wc: number } | null;
  isCinePlaying: boolean;
  currentSeries: any;
  parsedSlice: ParsedDicomFile | null;
  onGeometryUpdate?: (geom: SliceGeometry) => void;
}

export function useZenViewerSync({
  slice,
  maxSlices,
  setSlice,
  externalSlice,
  activeSeriesIndex,
  preset,
  setWw,
  setWc,
  resetKey,
  resetViewport,
  defaultWl,
  isCinePlaying,
  currentSeries,
  parsedSlice,
  onGeometryUpdate,
}: UseZenViewerSyncOptions) {
  const lastPresetRef = useRef<string>(preset);
  const onGeometryUpdateRef = useRef(onGeometryUpdate);

  useEffect(() => {
    onGeometryUpdateRef.current = onGeometryUpdate;
  });

  // External slice synchronization
  useEffect(() => {
    if (typeof externalSlice === 'number' && externalSlice !== slice) {
      setSlice(externalSlice);
    }
  }, [externalSlice, slice, setSlice]);

  // Reset slice index on series change
  useEffect(() => {
    setSlice(0);
  }, [activeSeriesIndex, setSlice]);

  // Sync Window presets
  useEffect(() => {
    if (lastPresetRef.current !== preset) {
      lastPresetRef.current = preset;
      const p = (WINDOW_PRESETS as Record<string, { ww: number; wc: number }>)[preset];
      if (p) {
        setWw(p.ww);
        setWc(p.wc);
      }
    }
  }, [preset, setWw, setWc]);

  // Viewport reset trigger
  useEffect(() => {
    if (resetKey !== undefined) {
      resetViewport();
      if (defaultWl) {
        setWw(defaultWl.ww);
        setWc(defaultWl.wc);
      }
    }
  }, [resetKey, resetViewport, defaultWl, setWw, setWc]);

  // Cine playback loop
  useEffect(() => {
    if (!isCinePlaying) return;
    const interval = setInterval(() => setSlice((p) => (p + 1) % maxSlices), 42);
    return () => clearInterval(interval);
  }, [isCinePlaying, maxSlices, setSlice]);

  const seriesLabel = currentSeries?.seriesDescription || currentSeries?.description || 'Axial Soft Tissue';
  const orient = useMemo(() => {
    if (parsedSlice?.meta.imageOrientationPatient) {
      const fromIop = getOrientationFromIop(parsedSlice.meta.imageOrientationPatient);
      if (fromIop) return fromIop;
    }
    if (currentSeries?.orientation) {
      const o = String(currentSeries.orientation).trim().toUpperCase();
      if (o === 'SAGITTAL' || o === 'CORONAL' || o === 'AXIAL') return o;
    }
    return detectOrientationFromDescription(seriesLabel);
  }, [parsedSlice?.meta.imageOrientationPatient, currentSeries?.orientation, seriesLabel]);
  const seriesNum = currentSeries?.seriesNumber || (activeSeriesIndex + 1);

  const currentGeometry: SliceGeometry = useMemo(
    () => ({
      seriesDescription: seriesLabel,
      seriesNumber: seriesNum,
      orientation: orient,
      sliceIndex: slice,
      totalSlices: maxSlices,
      imagePositionPatient: parsedSlice?.meta.imagePositionPatient,
      imageOrientationPatient: parsedSlice?.meta.imageOrientationPatient,
      pixelSpacing: parsedSlice?.meta.pixelSpacing,
      rows: parsedSlice?.meta.rows,
      columns: parsedSlice?.meta.columns,
    }),
    [seriesLabel, seriesNum, orient, slice, maxSlices, parsedSlice?.meta]
  );

  useEffect(() => {
    onGeometryUpdateRef.current?.(currentGeometry);
  }, [currentGeometry]);

  return { seriesLabel, orient, seriesNum, currentGeometry };
}
