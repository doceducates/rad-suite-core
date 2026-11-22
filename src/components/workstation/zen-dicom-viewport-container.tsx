'use client';

import React, { useState } from 'react';
import { ZenDicomViewportHeader } from './zen-dicom-viewport-header';
import { ZenDicomViewer } from './zen-dicom-viewer';
import { StitchQuadGrid } from './stitch-quad-grid';
import { ZenDicomSeriesDrawer } from './zen-dicom-series-drawer';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import type { ViewportLayoutMode } from '@/types/viewport';
import { cn } from '@/lib/utils';

export interface ZenDicomViewportContainerProps {
  accessionNumber: string;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: any[];
  seriesList?: any[];
  activeSeriesIndex?: number;
  onSelectSeries?: (idx: number) => void;
  onSwapCenter?: () => void;
  isCompanion?: boolean;
  className?: string;
}

const LAYOUT_DIMENSIONS: Record<ViewportLayoutMode, { rows: number; cols: number }> = {
  '1x1': { rows: 1, cols: 1 },
  '1x2': { rows: 1, cols: 2 },
  '1x3': { rows: 1, cols: 3 },
  '2x2': { rows: 2, cols: 2 },
  '3x3': { rows: 3, cols: 3 },
  '4x4': { rows: 4, cols: 4 },
};

export function ZenDicomViewportContainer({
  accessionNumber,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  localSeries = [],
  seriesList = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  onSwapCenter,
  isCompanion = false,
  className = '',
}: ZenDicomViewportContainerProps) {
  const [viewportLayout, setViewportLayout] = useState<ViewportLayoutMode>('1x1');
  const [activeDicomTool, setActiveDicomTool] = useState<DicomTool>('wl');
  const [viewerResetKey, setViewerResetKey] = useState<number>(0);
  const [localInvert, setLocalInvert] = useState<boolean>(false);
  const [isCinePlaying, setIsCinePlaying] = useState<boolean>(false);
  // Series column is available every time by default unless explicitly hidden by the user
  const [isSeriesVisible, setIsSeriesVisible] = useState<boolean>(true);

  const effectiveSeries = (seriesList && seriesList.length > 0) ? seriesList : localSeries;
  const activeSeries = effectiveSeries[activeSeriesIndex] || effectiveSeries[0];
  const { rows, cols } = LAYOUT_DIMENSIONS[viewportLayout] || { rows: 1, cols: 1 };
  const isDocked = !isCompanion;

  return (
    <div className={cn('flex-1 min-w-0 h-full flex flex-col overflow-hidden relative bg-black select-none', className)}>
      {/* Universal Viewport Header */}
      <ZenDicomViewportHeader
        isSeriesVisible={isSeriesVisible}
        onToggleSeries={() => setIsSeriesVisible((prev) => !prev)}
        layout={viewportLayout}
        onSelectLayout={setViewportLayout}
        activeTool={activeDicomTool}
        onSelectTool={setActiveDicomTool}
        modality={modality}
        seriesDescription={activeSeries?.seriesDescription}
        sliceCount={activeSeries?.sliceCount}
        invert={localInvert}
        onToggleInvert={() => setLocalInvert((v) => !v)}
        onResetViewport={() => setViewerResetKey((k) => k + 1)}
        isCinePlaying={isCinePlaying}
        onToggleCine={() => setIsCinePlaying((c) => !c)}
        onSwapCenter={onSwapCenter}
        isCompanion={isCompanion}
      />

      {/* Main Diagnostic Area: Persistent Side-by-Side Series Column + Viewport Canvas */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
        {/* Persistent / Docked Series Column (filmstrip on the left) */}
        {isSeriesVisible && (
          <ZenDicomSeriesDrawer
            isOpen={isSeriesVisible}
            onClose={() => setIsSeriesVisible(false)}
            seriesList={effectiveSeries}
            activeSeriesIndex={activeSeriesIndex}
            onSelectSeries={(idx) => {
              onSelectSeries?.(idx);
              if (!isDocked) setIsSeriesVisible(false);
            }}
            modality={modality}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            isDocked={isDocked}
          />
        )}

        {/* Viewport Canvas: 1x1 Single Viewport or Multi-Pane Grid */}
        <div className="flex-1 min-w-0 h-full relative">
          {viewportLayout === '1x1' ? (
            <ZenDicomViewer
              accessionNumber={accessionNumber}
              modality={modality}
              isLocalCase={isLocalCase}
              localCaseId={localCaseId}
              localSeries={localSeries}
              activeSeriesIndex={activeSeriesIndex}
              seriesList={seriesList}
              onSelectSeries={onSelectSeries}
              tool={activeDicomTool}
              invert={localInvert}
              resetKey={viewerResetKey}
              isCinePlaying={isCinePlaying}
              onToggleCine={() => setIsCinePlaying((c) => !c)}
              onToggleInvert={() => setLocalInvert((v) => !v)}
            />
          ) : (
            <StitchQuadGrid
              accessionNumber={accessionNumber}
              modality={modality}
              isLocalCase={isLocalCase}
              localCaseId={localCaseId}
              localSeries={localSeries}
              seriesList={seriesList}
              rows={rows}
              cols={cols}
              activeSeriesIndex={activeSeriesIndex}
              onActiveSeriesChange={onSelectSeries}
              tool={activeDicomTool}
              invert={localInvert}
              resetKey={viewerResetKey}
            />
          )}
        </div>
      </div>
    </div>
  );
}
