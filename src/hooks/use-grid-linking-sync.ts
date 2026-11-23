'use client';

import { useState, useCallback, useRef } from 'react';

export interface UseGridLinkingSyncOptions {
  totalPanes: number;
  unlinkedPanes: Set<number>;
  getPaneOrientation?: (paneIdx: number) => string;
}

export interface GridLinkingSyncState {
  zoomMap: Record<number, number>;
  panMap: Record<number, { x: number; y: number }>;
  handleZoomChange: (sourceIdx: number, newZoom: number) => void;
  handlePanChange: (
    sourceIdx: number,
    newPan: { x: number; y: number },
    delta?: { dx: number; dy: number }
  ) => void;
  resetPaneTransform: (paneIdx?: number) => void;
  getPaneZoom: (paneIdx: number) => number | undefined;
  getPanePan: (paneIdx: number) => { x: number; y: number } | undefined;
}

/**
 * useGridLinkingSync
 * Manages synchronized zoom and pan across linked panes in multi-view layouts.
 * - Zoom: Synchronizes scale across all linked panes so structures display at identical magnification.
 * - Pan: Synchronizes translation across linked co-planar panes in lockstep.
 * - W/L is kept strictly INDEPENDENT per series as each sequence has its own calibrated windowing.
 * - Unlinked panes are completely isolated.
 */
export function useGridLinkingSync({
  totalPanes,
  unlinkedPanes,
  getPaneOrientation,
}: UseGridLinkingSyncOptions): GridLinkingSyncState {
  const [zoomMap, setZoomMap] = useState<Record<number, number>>({});
  const [panMap, setPanMap] = useState<Record<number, { x: number; y: number }>>({});
  const isSyncingRef = useRef(false);

  const handleZoomChange = useCallback(
    (sourceIdx: number, newZoom: number) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      setZoomMap((prev) => {
        const next = { ...prev, [sourceIdx]: newZoom };
        // If source pane is linked, propagate zoom to all other linked panes
        if (!unlinkedPanes.has(sourceIdx)) {
          for (let i = 0; i < totalPanes; i++) {
            if (i !== sourceIdx && !unlinkedPanes.has(i)) {
              next[i] = newZoom;
            }
          }
        }
        return next;
      });

      isSyncingRef.current = false;
    },
    [totalPanes, unlinkedPanes]
  );

  const handlePanChange = useCallback(
    (
      sourceIdx: number,
      newPan: { x: number; y: number },
      delta?: { dx: number; dy: number }
    ) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      setPanMap((prev) => {
        const next = { ...prev, [sourceIdx]: newPan };
        // If source pane is linked, propagate pan to other linked panes
        if (!unlinkedPanes.has(sourceIdx)) {
          const srcOrient = getPaneOrientation?.(sourceIdx);
          for (let i = 0; i < totalPanes; i++) {
            if (i !== sourceIdx && !unlinkedPanes.has(i)) {
              if (delta) {
                // Apply delta to keep relative positioning
                const current = prev[i] || { x: 0, y: 0 };
                next[i] = { x: current.x + delta.dx, y: current.y + delta.dy };
              } else {
                // If co-planar or orientation-free, match pan
                const tgtOrient = getPaneOrientation?.(i);
                if (!srcOrient || !tgtOrient || srcOrient === tgtOrient) {
                  next[i] = newPan;
                }
              }
            }
          }
        }
        return next;
      });

      isSyncingRef.current = false;
    },
    [totalPanes, unlinkedPanes, getPaneOrientation]
  );

  const resetPaneTransform = useCallback(
    (paneIdx?: number) => {
      if (paneIdx !== undefined) {
        setZoomMap((prev) => ({ ...prev, [paneIdx]: 1 }));
        setPanMap((prev) => ({ ...prev, [paneIdx]: { x: 0, y: 0 } }));
      } else {
        setZoomMap({});
        setPanMap({});
      }
    },
    []
  );

  const getPaneZoom = useCallback(
    (paneIdx: number) => {
      return zoomMap[paneIdx];
    },
    [zoomMap]
  );

  const getPanePan = useCallback(
    (paneIdx: number) => {
      return panMap[paneIdx];
    },
    [panMap]
  );

  return {
    zoomMap,
    panMap,
    handleZoomChange,
    handlePanChange,
    resetPaneTransform,
    getPaneZoom,
    getPanePan,
  };
}
