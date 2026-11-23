'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { StitchMaximizedBadge } from './stitch-quad-grid-overlay';
import { StitchGridPane } from './stitch-grid-pane';
import { SliceGeometry } from '@/services/dicom-geometry.service';
import { useOrientationSync } from '@/hooks/use-orientation-sync';
import { useGrid3DNavigation } from '@/hooks/use-grid-3d-navigation';
import { useGridLinkingSync } from '@/hooks/use-grid-linking-sync';
import { Zen3DPointBanner } from './zen-3d-point-banner';

interface StitchQuadGridProps {
  accessionNumber: string;
  modality: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: any[];
  seriesList?: any[];
  tool?: DicomTool;
  preset?: string;
  syncScroll?: boolean;
  scoutLinesActive?: boolean;
  invert?: boolean;
  resetKey?: number;
  rows?: number;
  cols?: number;
  activeSeriesIndex?: number;
  seriesSelectToken?: number;
  onActiveSeriesChange?: (seriesIndex: number) => void;
  paneSeriesMap?: Record<number, number>;
  onUpdatePaneSeries?: (paneIdx: number, seriesIdx: number) => void;
}

export function StitchQuadGrid(props: StitchQuadGridProps) {
  const {
    accessionNumber, modality, isLocalCase = false, localCaseId, localSeries = [], seriesList = [],
    tool = 'pan', preset = 'soft', syncScroll = true, scoutLinesActive = true, invert = false,
    resetKey, rows = 2, cols = 2, activeSeriesIndex = 0, seriesSelectToken = 0, onActiveSeriesChange,
    paneSeriesMap: propPaneSeriesMap, onUpdatePaneSeries,
  } = props;
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const [localPaneSeriesMap, setLocalPaneSeriesMap] = useState<Record<number, number>>({});
  const paneSeriesMap = propPaneSeriesMap || localPaneSeriesMap;
  const [panesGeometry, setPanesGeometry] = useState<Record<number, SliceGeometry>>({});
  const [dragOverPaneIndex, setDragOverPaneIndex] = useState<number | null>(null);
  const [maximizedPaneIndex, setMaximizedPaneIndex] = useState<number | null>(null);
  const [unlinkedPanes, setUnlinkedPanes] = useState<Set<number>>(new Set());
  const [subtractedPanes, setSubtractedPanes] = useState<Set<number>>(new Set());
  const [pendingSwapPane, setPendingSwapPane] = useState<number | null>(null);

  const r = Math.max(1, Math.min(5, rows || 2));
  const c = Math.max(1, Math.min(5, cols || 2));
  const totalPanes = r * c;
  const lastHandledTokenRef = useRef(seriesSelectToken);

  const availableSeries = (localSeries && localSeries.length > 0)
    ? localSeries
    : (seriesList && seriesList.length > 0)
      ? seriesList
      : [];

  useEffect(() => {
    if (seriesSelectToken > lastHandledTokenRef.current && activeSeriesIndex !== undefined) {
      lastHandledTokenRef.current = seriesSelectToken;
      if (onUpdatePaneSeries) onUpdatePaneSeries(activeCellIndex, activeSeriesIndex);
      else setLocalPaneSeriesMap((prev) => ({ ...prev, [activeCellIndex]: activeSeriesIndex }));
    }
  }, [seriesSelectToken, activeSeriesIndex, activeCellIndex, onUpdatePaneSeries]);

  const getAssignedSeries = useCallback(
    (paneIdx: number) => {
      if (availableSeries.length === 0) return [];
      const mappedIdx = paneSeriesMap[paneIdx] ?? (paneIdx % availableSeries.length);
      if (mappedIdx === -1) return []; // -1 indicates cleared/closed pane
      const validIdx = Math.max(0, Math.min(availableSeries.length - 1, mappedIdx));
      return [availableSeries[validIdx]];
    },
    [availableSeries, paneSeriesMap]
  );

  const getPaneOrientation = useCallback(
    (paneIdx: number): 'AXIAL' | 'SAGITTAL' | 'CORONAL' => {
      const series = getAssignedSeries(paneIdx);
      if (series[0]?.orientation) return series[0].orientation;
      if (panesGeometry[paneIdx]?.orientation) return panesGeometry[paneIdx].orientation!;
      return 'AXIAL';
    },
    [getAssignedSeries, panesGeometry]
  );

  const {
    handleSliceChange, handleSelectScoutSlice, clearDirectSlice, getExternalSlice, jumpPanesToSlices,
  } = useOrientationSync({
    totalPanes, activeCellIndex, syncScroll, unlinkedPanes, getAssignedSeries, getPaneOrientation, onFocusPane: setActiveCellIndex,
  });

  const {
    active3DPoint, isCrosshairVisible, handlePoint3DSelect, clear3DPoint, toggleCrosshairVisibility,
  } = useGrid3DNavigation({
    totalPanes, getAssignedSeries, jumpPanesToSlices, maximizedPaneIndex,
    onClearMaximized: () => setMaximizedPaneIndex(null),
  });

  const { handleZoomChange, handlePanChange, getPaneZoom, getPanePan } = useGridLinkingSync({
    totalPanes, unlinkedPanes, getPaneOrientation,
  });

  const handleToggleSubtraction = useCallback((pIdx: number) => {
    setSubtractedPanes((prev) => { const n = new Set(prev); if (n.has(pIdx)) n.delete(pIdx); else n.add(pIdx); return n; });
  }, []);

  const handleToggleLink = useCallback((pIdx: number) => {
    setUnlinkedPanes((prev) => { const n = new Set(prev); if (n.has(pIdx)) n.delete(pIdx); else n.add(pIdx); return n; });
  }, []);

  const handleSnapshotPane = useCallback((paneIdx: number) => {
    const canvases = document.querySelectorAll('canvas');
    if (canvases && canvases[paneIdx]) {
      try {
        const a = document.createElement('a');
        a.href = canvases[paneIdx].toDataURL('image/png');
        a.download = `Snapshot_P${paneIdx + 1}_${accessionNumber}.png`;
        a.click();
      } catch (err) {
        console.warn('Snapshot error:', err);
      }
    }
  }, [accessionNumber]);

  const handleClosePane = useCallback((paneIdx: number) => {
    if (onUpdatePaneSeries) onUpdatePaneSeries(paneIdx, -1);
    else setLocalPaneSeriesMap((prev) => ({ ...prev, [paneIdx]: -1 }));
  }, [onUpdatePaneSeries]);

  const handlePaneSliceChange = useCallback(
    (paneIdx: number, sl: number, total: number) => {
      if (unlinkedPanes.has(paneIdx)) return;
      handleSliceChange(paneIdx, sl, total);
    },
    [unlinkedPanes, handleSliceChange]
  );

  const executeSwap = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const fromSeries = paneSeriesMap[fromIdx] ?? (fromIdx % (availableSeries.length || 1));
    const toSeries = paneSeriesMap[toIdx] ?? (toIdx % (availableSeries.length || 1));
    if (onUpdatePaneSeries) {
      onUpdatePaneSeries(fromIdx, toSeries);
      onUpdatePaneSeries(toIdx, fromSeries);
    } else {
      setLocalPaneSeriesMap((prev) => ({ ...prev, [fromIdx]: toSeries, [toIdx]: fromSeries }));
    }
    clearDirectSlice(fromIdx);
    clearDirectSlice(toIdx);
    setActiveCellIndex(toIdx);
    setPendingSwapPane(null);
  }, [availableSeries.length, clearDirectSlice, onUpdatePaneSeries, paneSeriesMap]);

  const handleRearrangeClick = useCallback((paneIdx: number) => {
    setPendingSwapPane((prev) => {
      if (prev === null) return paneIdx;
      if (prev === paneIdx) return null;
      executeSwap(prev, paneIdx);
      return null;
    });
  }, [executeSwap]);

  const handlePaneClick = useCallback((idx: number) => {
    if (pendingSwapPane !== null) {
      if (pendingSwapPane !== idx) executeSwap(pendingSwapPane, idx);
      else setPendingSwapPane(null);
      return;
    }
    setActiveCellIndex(idx);
    clearDirectSlice(idx);
    if (availableSeries.length > 0) {
      const mappedIdx = paneSeriesMap[idx] ?? (idx % availableSeries.length);
      if (mappedIdx >= 0) onActiveSeriesChange?.(mappedIdx);
    }
  }, [pendingSwapPane, executeSwap, availableSeries.length, paneSeriesMap, onActiveSeriesChange, clearDirectSlice]);

  const handleDrop = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPaneIndex(null);

    // 1. Swap panes via Re-arrange tool
    const swapFrom = e.dataTransfer.getData('application/rad-pane-swap');
    if (swapFrom !== '') {
      const fromIdx = parseInt(swapFrom, 10);
      if (!isNaN(fromIdx) && fromIdx !== idx) {
        executeSwap(fromIdx, idx);
        return;
      }
    }

    // 2. Drop series from docked series column
    const raw = e.dataTransfer.getData('application/rad-series-index') || e.dataTransfer.getData('text/plain');
    const sIdx = parseInt(raw, 10);
    if (!isNaN(sIdx) && sIdx >= 0 && sIdx < (availableSeries.length || 100)) {
      if (onUpdatePaneSeries) onUpdatePaneSeries(idx, sIdx);
      else setLocalPaneSeriesMap((prev) => ({ ...prev, [idx]: sIdx }));
      clearDirectSlice(idx);
      setActiveCellIndex(idx);
      onActiveSeriesChange?.(sIdx);
    }
  }, [executeSwap, availableSeries.length, onActiveSeriesChange, clearDirectSlice, onUpdatePaneSeries]);

  const handleGeometryUpdate = useCallback((idx: number, geom: SliceGeometry) => {
    setPanesGeometry((prev) => {
      const cur = prev[idx];
      if (cur && cur.sliceIndex === geom.sliceIndex && cur.seriesNumber === geom.seriesNumber) return prev;
      return { ...prev, [idx]: geom };
    });
  }, []);

  const handleDragOver = useCallback((pIdx: number, e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    if (dragOverPaneIndex !== pIdx) setDragOverPaneIndex(pIdx);
  }, [dragOverPaneIndex]);

  const handleDragLeave = useCallback((_pIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverPaneIndex(null);
  }, []);

  const renderPane = (idx: number) => {
    const assignedSeries = getAssignedSeries(idx);
    const sCount = assignedSeries[0]?.sliceCount || 32;
    const isLinked = !unlinkedPanes.has(idx);
    const extSlice = isLinked ? getExternalSlice(idx, sCount) : undefined;
    const extZoom = isLinked ? getPaneZoom(idx) : undefined;
    const extPan = isLinked ? getPanePan(idx) : undefined;

    return (
      <StitchGridPane
        key={idx} idx={idx} isActive={idx === activeCellIndex} isDragOver={idx === dragOverPaneIndex}
        assignedSeries={assignedSeries} externalSlice={extSlice} externalZoom={extZoom}
        onZoomChange={handleZoomChange} externalPan={extPan} onPanChange={handlePanChange}
        scoutLinesActive={scoutLinesActive} panesGeometry={panesGeometry} totalPanes={totalPanes}
        accessionNumber={accessionNumber} modality={modality} isLocalCase={isLocalCase} localCaseId={localCaseId}
        tool={tool} preset={preset} invert={invert} resetKey={resetKey} active3DPoint={active3DPoint}
        onPoint3DSelect={(pt) => handlePoint3DSelect(pt, idx)} isCrosshairVisible={isCrosshairVisible}
        onClear3DPoint={clear3DPoint} onClick={handlePaneClick}
        onDoubleClick={(pIdx) => setMaximizedPaneIndex((prev) => (prev === pIdx ? null : pIdx))}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onGeometryUpdate={handleGeometryUpdate} onSliceChange={handlePaneSliceChange}
        onSelectScoutSlice={handleSelectScoutSlice} isLinked={isLinked} isPendingSwap={pendingSwapPane === idx}
        isSubtractionActive={subtractedPanes.has(idx)} onToggleSubtraction={handleToggleSubtraction}
        onToggleLink={handleToggleLink} onSnapshot={handleSnapshotPane} onClosePane={handleClosePane}
        onRearrangeClick={handleRearrangeClick}
      />
    );
  };

  return (
    <div className="w-full h-full bg-surface-container-low flex flex-col overflow-hidden select-none relative stitch-grid-container">
      {active3DPoint !== null && (
        <Zen3DPointBanner
          point3D={active3DPoint}
          isVisible={isCrosshairVisible}
          onToggleVisibility={toggleCrosshairVisibility}
          onClear={clear3DPoint}
        />
      )}
      {maximizedPaneIndex !== null ? (
        <div className="w-full h-full p-1.5 relative">
          {renderPane(maximizedPaneIndex)}
          <StitchMaximizedBadge
            paneLabel={`P${maximizedPaneIndex + 1}`}
            gridCols={c}
            gridRows={r}
            onRestore={() => setMaximizedPaneIndex(null)}
          />
        </div>
      ) : (
        <div
          className="flex-1 grid gap-1.5 p-1.5 min-h-0 overflow-hidden bg-surface-container-low"
          style={{
            gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${r}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: totalPanes }, (_, idx) => renderPane(idx))}
        </div>
      )}
    </div>
  );
}
