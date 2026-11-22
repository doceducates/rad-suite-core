'use client';

import { useState, useCallback, useEffect } from 'react';
import { findNearestSliceIndexFor3DPoint } from '@/services/dicom-3d-point.service';

interface UseGrid3DNavigationOptions {
  totalPanes: number;
  getAssignedSeries: (paneIdx: number) => any[];
  jumpPanesToSlices: (targets: Record<number, number>) => void;
  maximizedPaneIndex: number | null;
  onClearMaximized: () => void;
}

export function useGrid3DNavigation({
  totalPanes,
  getAssignedSeries,
  jumpPanesToSlices,
  maximizedPaneIndex,
  onClearMaximized,
}: UseGrid3DNavigationOptions) {
  const [active3DPoint, setActive3DPoint] = useState<[number, number, number] | null>(null);
  const [isCrosshairVisible, setIsCrosshairVisible] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === 'Escape') {
        if (active3DPoint !== null) {
          setActive3DPoint(null);
          return;
        }
        if (maximizedPaneIndex !== null) onClearMaximized();
      } else if (e.key.toLowerCase() === 'h' && active3DPoint !== null) {
        setIsCrosshairVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedPaneIndex, active3DPoint, onClearMaximized]);

  const handlePoint3DSelect = useCallback(
    (pt: [number, number, number], sourcePaneIdx: number) => {
      setActive3DPoint(pt);
      setIsCrosshairVisible(true);
      const targets: Record<number, number> = {};
      for (let i = 0; i < totalPanes; i++) {
        if (i === sourcePaneIdx) continue;
        const assigned = getAssignedSeries(i);
        const s = assigned[0];
        if (s) {
          const targetSlice = findNearestSliceIndexFor3DPoint(pt, {
            sliceCount: s.sliceCount || 32,
            orientation: s.orientation,
            firstIpp: s.firstIpp,
            lastIpp: s.lastIpp,
            iop: s.iop,
            pixelSpacing: s.pixelSpacing,
            rows: s.rows,
            columns: s.columns,
          });
          targets[i] = targetSlice;
        }
      }
      if (Object.keys(targets).length > 0) {
        jumpPanesToSlices(targets);
      }
    },
    [totalPanes, getAssignedSeries, jumpPanesToSlices]
  );

  const clear3DPoint = useCallback(() => setActive3DPoint(null), []);
  const toggleCrosshairVisibility = useCallback(() => setIsCrosshairVisible((v) => !v), []);

  return {
    active3DPoint,
    isCrosshairVisible,
    handlePoint3DSelect,
    clear3DPoint,
    toggleCrosshairVisibility,
  };
}
