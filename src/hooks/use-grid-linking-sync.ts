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
 * Pure function: calculates updated zoom map across linked panes.
 * Unlinked panes are completely isolated.
 */
export function propagateZoom(
  sourceIdx: number,
  newZoom: number,
  totalPanes: number,
  unlinkedPanes: Set<number>,
  prevZoomMap: Record<number, number>
): Record<number, number> {
  const next = { ...prevZoomMap, [sourceIdx]: newZoom };
  if (!unlinkedPanes.has(sourceIdx)) {
    for (let i = 0; i < totalPanes; i++) {
      if (i !== sourceIdx && !unlinkedPanes.has(i)) {
        next[i] = newZoom;
      }
    }
  }
  return next;
}

/**
 * Pure function: calculates updated pan map across linked co-planar panes.
 * Unlinked panes are completely isolated.
 */
export function propagatePan(
  sourceIdx: number,
  newPan: { x: number; y: number },
  delta: { dx: number; dy: number } | undefined,
  totalPanes: number,
  unlinkedPanes: Set<number>,
  prevPanMap: Record<number, { x: number; y: number }>,
  getPaneOrientation?: (paneIdx: number) => string
): Record<number, { x: number; y: number }> {
  const next = { ...prevPanMap, [sourceIdx]: newPan };
  if (!unlinkedPanes.has(sourceIdx)) {
    const srcOrient = getPaneOrientation?.(sourceIdx);
    for (let i = 0; i < totalPanes; i++) {
      if (i !== sourceIdx && !unlinkedPanes.has(i)) {
        if (delta) {
          const current = prevPanMap[i] || { x: 0, y: 0 };
          next[i] = { x: current.x + delta.dx, y: current.y + delta.dy };
        } else {
          const tgtOrient = getPaneOrientation?.(i);
          if (!srcOrient || !tgtOrient || srcOrient === tgtOrient) {
            next[i] = newPan;
          }
        }
      }
    }
  }
  return next;
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
      setZoomMap((prev) => propagateZoom(sourceIdx, newZoom, totalPanes, unlinkedPanes, prev));
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
      setPanMap((prev) =>
        propagatePan(sourceIdx, newPan, delta, totalPanes, unlinkedPanes, prev, getPaneOrientation)
      );
      isSyncingRef.current = false;
    },
    [totalPanes, unlinkedPanes, getPaneOrientation]
  );

  const resetPaneTransform = useCallback((paneIdx?: number) => {
    if (paneIdx !== undefined) {
      setZoomMap((prev) => ({ ...prev, [paneIdx]: 1 }));
      setPanMap((prev) => ({ ...prev, [paneIdx]: { x: 0, y: 0 } }));
    } else {
      setZoomMap({});
      setPanMap({});
    }
  }, []);

  const getPaneZoom = useCallback((paneIdx: number) => zoomMap[paneIdx], [zoomMap]);
  const getPanePan = useCallback((paneIdx: number) => panMap[paneIdx], [panMap]);

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
