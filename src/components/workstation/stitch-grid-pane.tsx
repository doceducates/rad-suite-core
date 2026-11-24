'use client';

import React, { useMemo, useCallback } from 'react';
import { ZenDicomViewer } from './zen-dicom-viewer';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { StitchGridOverlay } from './stitch-quad-grid-overlay';
import { SliceGeometry, ProjectedScoutLine, computeScoutIntersection } from '@/services/dicom-geometry.service';

interface StitchGridPaneProps {
  idx: number;
  isActive: boolean;
  isDragOver: boolean;
  assignedSeries: any[];
  externalSlice?: number;
  scoutLinesActive: boolean;
  panesGeometry: Record<number, SliceGeometry>;
  totalPanes: number;
  accessionNumber: string;
  modality: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  tool?: DicomTool;
  preset?: string;
  invert?: boolean;
  resetKey?: number;
  externalZoom?: number;
  onZoomChange?: (paneIdx: number, zoom: number) => void;
  externalPan?: { x: number; y: number };
  onPanChange?: (paneIdx: number, pan: { x: number; y: number }, delta?: { dx: number; dy: number }) => void;
  isLinked?: boolean;
  isPendingSwap?: boolean;
  isSubtractionActive?: boolean;
  onToggleSubtraction?: (paneIdx: number) => void;
  onToggleLink?: (paneIdx: number) => void;
  onSnapshot?: (paneIdx: number) => void;
  onClosePane?: (paneIdx: number) => void;
  onRearrangeClick?: (paneIdx: number) => void;
  onClick: (idx: number) => void;
  onDoubleClick: (idx: number) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDragLeave: (idx: number, e: React.DragEvent) => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onGeometryUpdate: (idx: number, geom: SliceGeometry) => void;
  onSliceChange?: (paneIdx: number, slice: number, totalSlices: number) => void;
  onSelectScoutSlice?: (sourceSeriesNumber: string | number, sliceIndex: number) => void;
  active3DPoint?: [number, number, number] | null;
  onPoint3DSelect?: (pt: [number, number, number]) => void;
  isCrosshairVisible?: boolean;
  onClear3DPoint?: () => void;
}

export function StitchGridPane({
  idx,
  isActive,
  isDragOver,
  assignedSeries,
  externalSlice,
  scoutLinesActive,
  panesGeometry,
  totalPanes,
  accessionNumber,
  modality,
  isLocalCase = false,
  localCaseId,
  tool = 'wl',
  preset = 'soft',
  invert = false,
  resetKey,
  externalZoom,
  onZoomChange,
  externalPan,
  onPanChange,
  isLinked = true,
  isPendingSwap = false,
  isSubtractionActive = false,
  onToggleSubtraction,
  onToggleLink,
  onSnapshot,
  onClosePane,
  onRearrangeClick,
  onClick,
  onDoubleClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onGeometryUpdate,
  onSliceChange,
  onSelectScoutSlice,
  active3DPoint,
  onPoint3DSelect,
  isCrosshairVisible = true,
  onClear3DPoint,
}: StitchGridPaneProps) {
  const sCount = assignedSeries[0]?.sliceCount || 32;

  const paneScoutLines = useMemo(() => {
    if (!scoutLinesActive) return [];
    const currentPaneGeom = panesGeometry[idx];
    if (!currentPaneGeom) return [];

    const lines: ProjectedScoutLine[] = [];
    const seenIds = new Set<string>();
    for (let otherIdx = 0; otherIdx < totalPanes; otherIdx++) {
      if (otherIdx !== idx) {
        const otherGeom = panesGeometry[otherIdx];
        if (otherGeom) {
          const scout = computeScoutIntersection(otherGeom, currentPaneGeom);
          if (scout && !seenIds.has(scout.id)) {
            seenIds.add(scout.id);
            lines.push(scout);
          }
        }
      }
    }
    return lines;
  }, [scoutLinesActive, panesGeometry, idx, totalPanes]);

  const handleGeomUpdate = useCallback(
    (geom: SliceGeometry) => {
      onGeometryUpdate(idx, geom);
    },
    [idx, onGeometryUpdate]
  );

  const handlePaneSliceChange = useCallback(
    (sl: number) => {
      onSliceChange?.(idx, sl, sCount);
    },
    [idx, sCount, onSliceChange]
  );

  return (
    <div
      onClick={() => onClick(idx)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(idx);
      }}
      onDragOver={(e) => onDragOver(idx, e)}
      onDragLeave={(e) => onDragLeave(idx, e)}
      onDrop={(e) => onDrop(idx, e)}
      className={`relative bg-black rounded-[3px] overflow-hidden cursor-crosshair transition-all border ${
        isActive
          ? 'border-2 border-primary ring-1 ring-primary/40 shadow-xs'
          : 'border-outline-variant/40 hover:border-outline'
      } ${isDragOver ? 'ring-4 ring-primary border-primary' : ''}`}
    >
      {assignedSeries.length > 0 ? (
        <ZenDicomViewer
          accessionNumber={accessionNumber}
          modality={modality}
          isLocalCase={isLocalCase}
          localCaseId={localCaseId}
          localSeries={assignedSeries}
          activeSeriesIndex={0}
          tool={tool}
          preset={preset}
          invert={invert}
          resetKey={resetKey}
          externalSlice={externalSlice}
          externalZoom={externalZoom}
          onZoomChange={(z) => onZoomChange?.(idx, z)}
          externalPan={externalPan}
          onPanChange={(p, delta) => onPanChange?.(idx, p, delta)}
          scoutLines={paneScoutLines}
          active3DPoint={active3DPoint}
          onPoint3DSelect={onPoint3DSelect}
          isCrosshairVisible={isCrosshairVisible}
          onClear3DPoint={onClear3DPoint}
          onSelectScoutSlice={onSelectScoutSlice}
          onGeometryUpdate={handleGeomUpdate}
          onSliceChange={handlePaneSliceChange}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 text-muted-foreground select-none p-4 text-center">
          <span className="text-xs font-mono font-bold mb-1 text-muted-foreground/80">Viewport {idx + 1} Empty</span>
          <span className="text-[10px] text-muted-foreground/50">Drag a sequence from the left rail here</span>
        </div>
      )}

      {/* Vitrea MMV Pane Header Mini-Toolbar (Link/Unlink, Snapshot, Maximize, Close, Rearrange) */}
      <StitchGridOverlay
        paneIdx={idx}
        paneLabel={`P${idx + 1}`}
        isActive={isActive}
        isDragOver={isDragOver}
        totalPanes={totalPanes}
        isLinked={isLinked}
        isPendingSwap={isPendingSwap}
        isSubtractionActive={isSubtractionActive}
        onToggleSubtraction={onToggleSubtraction}
        onToggleLink={onToggleLink}
        onSnapshot={onSnapshot}
        onClose={onClosePane}
        onMaximize={onDoubleClick}
        onRearrangeClick={onRearrangeClick}
      />
    </div>
  );
}
