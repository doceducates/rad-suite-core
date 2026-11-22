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
      className={`relative bg-black rounded-xl overflow-hidden cursor-crosshair transition-all border ${
        isActive
          ? 'border-2 border-primary ring-2 ring-primary/40 shadow-xs'
          : 'border-outline-variant/40 hover:border-outline'
      } ${isDragOver ? 'ring-4 ring-primary border-primary' : ''}`}
    >
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
        scoutLines={paneScoutLines}
        active3DPoint={active3DPoint}
        onPoint3DSelect={onPoint3DSelect}
        isCrosshairVisible={isCrosshairVisible}
        onClear3DPoint={onClear3DPoint}
        onSelectScoutSlice={onSelectScoutSlice}
        onGeometryUpdate={handleGeomUpdate}
        onSliceChange={handlePaneSliceChange}
      />

      <StitchGridOverlay
        paneLabel={`P${idx + 1}`}
        isActive={isActive}
        isDragOver={isDragOver}
        totalPanes={totalPanes}
      />
    </div>
  );
}
