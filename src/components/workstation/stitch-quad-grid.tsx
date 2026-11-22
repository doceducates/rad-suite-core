'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { StitchMaximizedBadge } from './stitch-quad-grid-overlay';
import { StitchGridPane } from './stitch-grid-pane';
import { SliceGeometry } from '@/services/dicom-geometry.service';
import { useOrientationSync } from '@/hooks/use-orientation-sync';
import { useGrid3DNavigation } from '@/hooks/use-grid-3d-navigation';
import { Zen3DPointBanner } from './zen-3d-point-banner';

interface StitchQuadGridProps {
  accessionNumber: string;
  modality: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: any[];
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
    accessionNumber, modality, isLocalCase = false, localCaseId, localSeries = [],
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
  const r = Math.max(1, Math.min(5, rows || 2));
  const c = Math.max(1, Math.min(5, cols || 2));
  const totalPanes = r * c;
  const lastHandledTokenRef = useRef(seriesSelectToken);

  useEffect(() => {
    if (seriesSelectToken > lastHandledTokenRef.current && activeSeriesIndex !== undefined) {
      lastHandledTokenRef.current = seriesSelectToken;
      if (onUpdatePaneSeries) onUpdatePaneSeries(activeCellIndex, activeSeriesIndex);
      else setLocalPaneSeriesMap((prev) => ({ ...prev, [activeCellIndex]: activeSeriesIndex }));
    }
  }, [seriesSelectToken, activeSeriesIndex, activeCellIndex, onUpdatePaneSeries]);

  const getAssignedSeries = useCallback(
    (paneIdx: number) => {
      if (!isLocalCase || localSeries.length === 0) return [];
      const mappedIdx = paneSeriesMap[paneIdx] ?? (paneIdx % localSeries.length);
      const validIdx = Math.max(0, Math.min(localSeries.length - 1, mappedIdx));
      return [localSeries[validIdx]];
    },
    [isLocalCase, localSeries, paneSeriesMap]
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
    totalPanes, activeCellIndex, syncScroll, getAssignedSeries, getPaneOrientation, onFocusPane: setActiveCellIndex,
  });

  const {
    active3DPoint,
    isCrosshairVisible,
    handlePoint3DSelect,
    clear3DPoint,
    toggleCrosshairVisibility,
  } = useGrid3DNavigation({
    totalPanes,
    getAssignedSeries,
    jumpPanesToSlices,
    maximizedPaneIndex,
    onClearMaximized: () => setMaximizedPaneIndex(null),
  });

  const handlePaneClick = useCallback((idx: number) => {
    setActiveCellIndex(idx);
    clearDirectSlice(idx);
    if (isLocalCase && localSeries.length > 0) {
      const mappedIdx = paneSeriesMap[idx] ?? (idx % localSeries.length);
      onActiveSeriesChange?.(mappedIdx);
    }
  }, [isLocalCase, localSeries.length, paneSeriesMap, onActiveSeriesChange, clearDirectSlice]);

  const handleDrop = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPaneIndex(null);
    const raw = e.dataTransfer.getData('application/rad-series-index') || e.dataTransfer.getData('text/plain');
    const sIdx = parseInt(raw, 10);
    if (!isNaN(sIdx) && sIdx >= 0 && sIdx < (localSeries.length || 100)) {
      if (onUpdatePaneSeries) onUpdatePaneSeries(idx, sIdx);
      else setLocalPaneSeriesMap((prev) => ({ ...prev, [idx]: sIdx }));
      clearDirectSlice(idx);
      setActiveCellIndex(idx);
      onActiveSeriesChange?.(sIdx);
    }
  }, [localSeries.length, onActiveSeriesChange, clearDirectSlice, onUpdatePaneSeries]);

  const handleGeometryUpdate = useCallback((idx: number, geom: SliceGeometry) => {
    setPanesGeometry((prev) => {
      const cur = prev[idx];
      if (cur && cur.sliceIndex === geom.sliceIndex && cur.seriesNumber === geom.seriesNumber) {
        return prev;
      }
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
    return (
      <StitchGridPane
        key={idx} idx={idx} isActive={idx === activeCellIndex} isDragOver={idx === dragOverPaneIndex}
        assignedSeries={assignedSeries} externalSlice={getExternalSlice(idx, sCount)}
        scoutLinesActive={scoutLinesActive} panesGeometry={panesGeometry} totalPanes={totalPanes}
        accessionNumber={accessionNumber} modality={modality} isLocalCase={isLocalCase} localCaseId={localCaseId}
        tool={tool} preset={preset} invert={invert} resetKey={resetKey} active3DPoint={active3DPoint}
        onPoint3DSelect={(pt) => handlePoint3DSelect(pt, idx)} isCrosshairVisible={isCrosshairVisible}
        onClear3DPoint={clear3DPoint} onClick={handlePaneClick}
        onDoubleClick={(pIdx) => setMaximizedPaneIndex((prev) => (prev === pIdx ? null : pIdx))}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onGeometryUpdate={handleGeometryUpdate} onSliceChange={handleSliceChange}
        onSelectScoutSlice={handleSelectScoutSlice}
      />
    );
  };

  return (
    <div className="w-full h-full bg-surface-container-low flex flex-col overflow-hidden select-none relative">
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
