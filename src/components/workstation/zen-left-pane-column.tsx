'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { StitchVerticalSeriesRail } from './stitch-vertical-series-rail';
import { ZenMobileSeriesBar } from './zen-mobile-series-bar';
import { ZenInframeFloatingToolbar } from './zen-inframe-floating-toolbar';
import { type StitchSeriesItem } from './stitch-filmstrip';
import { StitchQuadGrid } from './stitch-quad-grid';
import { ZenDicomViewer } from './zen-dicom-viewer';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { ZenWorkstationStandby, StandbyCaseItem } from './zen-workstation-standby';

const Zen3DVolumeStage = dynamic(
  () => import('./zen-3d-volume-stage').then((m) => m.Zen3DVolumeStage),
  { ssr: false }
);

interface ZenLeftPaneColumnProps {
  study: any;
  isLocalCase: boolean;
  localCaseId?: string;
  localSeries?: any[];
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  seriesSelectToken?: number;
  onSelectSeries: (idx: number) => void;
  onActiveSeriesChange?: (seriesIndex: number) => void;
  paneSeriesMap: Record<number, number>;
  onUpdatePaneSeries: (paneIdx: number, seriesIdx: number) => void;
  tool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  preset: string;
  onSelectPreset: (preset: string) => void;
  isCinePlaying: boolean;
  onToggleCine: () => void;
  syncScroll?: boolean;
  onToggleSyncScroll: () => void;
  scoutLinesActive?: boolean;
  onToggleScoutLines?: () => void;
  onInvert: () => void;
  onReset: () => void;
  cadActive?: boolean;
  onToggleCad?: () => void;
  onExport: () => void;
  invert?: boolean;
  resetKey?: number;
  gridRows?: number;
  gridCols?: number;
  onSelectGrid?: (rows: number, cols: number) => void;
  is3DActive?: boolean;
  onToggle3D?: () => void;
  hasStudy?: boolean;
  onOpenPacsSearch?: () => void;
  recentCases?: StandbyCaseItem[];
  onStartBlankReport?: () => void;
  onUploadGoogleDrive?: () => void;
  uploadingGoogleDrive?: boolean;
  onOpenFolderImport?: () => void;
  currentUser?: any;
}

export function ZenLeftPaneColumn(props: ZenLeftPaneColumnProps) {
  if (props.hasStudy === false) {
    return (
      <ZenWorkstationStandby
        onOpenPacsSearch={props.onOpenPacsSearch || (() => {})}
        recentCases={props.recentCases}
        onStartBlankReport={props.onStartBlankReport}
        onOpenFolderImport={props.onOpenFolderImport}
        currentUser={props.currentUser}
      />
    );
  }

  const {
    study, isLocalCase, localCaseId, localSeries = [], seriesList, activeSeriesIndex,
    seriesSelectToken, onSelectSeries, onActiveSeriesChange, paneSeriesMap, onUpdatePaneSeries,
    tool, onSelectTool, preset, onSelectPreset, isCinePlaying, onToggleCine,
    syncScroll = true, onToggleSyncScroll, scoutLinesActive = true, onToggleScoutLines,
    onInvert, onReset, cadActive, onToggleCad, onExport, invert = false, resetKey,
    gridRows = 1, gridCols = 1, onSelectGrid, is3DActive, onToggle3D,
  } = props;

  const [internal3DActive, setInternal3DActive] = useState(false);
  const [isDragOverSingle, setIsDragOverSingle] = useState(false);
  const [colormapId, setColormapId] = useState('grayscale');
  const is3D = is3DActive ?? internal3DActive;
  const toggle3D = onToggle3D ?? (() => setInternal3DActive((v) => !v));

  const isMultiPane = gridRows > 1 || gridCols > 1;
  const currentSeries = isLocalCase && localSeries ? localSeries[activeSeriesIndex] : null;

  const handleSingleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverSingle(true);
  };

  const handleSingleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverSingle(false);
    }
  };

  const handleSingleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSingle(false);
    const raw = e.dataTransfer.getData('application/rad-series-index') || e.dataTransfer.getData('text/plain');
    const sIdx = parseInt(raw, 10);
    if (!isNaN(sIdx) && sIdx >= 0) {
      onSelectSeries(sIdx);
      onUpdatePaneSeries?.(0, sIdx);
      onActiveSeriesChange?.(sIdx);
    }
  };

  return (
    <div className="flex-1 flex flex-row min-w-0 h-full overflow-hidden relative">
      {/* 1. Vertical Series Rail (Watson Workstation Style) */}
      <StitchVerticalSeriesRail
        seriesList={seriesList}
        activeSeriesIndex={activeSeriesIndex}
        onSelectSeries={onSelectSeries}
        modality={study.modality}
        isLocalCase={isLocalCase}
        localCaseId={localCaseId}
        invert={invert}
      />

      {/* 2. Diagnostic Viewport Container with In-Frame Floating HUD */}
      <div className="flex-1 min-h-0 h-full relative overflow-hidden flex flex-col bg-black">
        {/* Mobile Top Horizontal Series Chips & Drawer Trigger (md:hidden) */}
        <ZenMobileSeriesBar
          seriesList={seriesList}
          activeSeriesIndex={activeSeriesIndex}
          onSelectSeries={onSelectSeries}
          modality={study.modality}
          isLocalCase={isLocalCase}
          localCaseId={localCaseId}
          invert={invert}
        />

        {/* In-Frame Floating HUD Toolbar */}
        <ZenInframeFloatingToolbar
          activeTool={tool}
          onSelectTool={onSelectTool}
          preset={preset}
          onSelectPreset={onSelectPreset}
          activeColormapId={colormapId}
          onSelectColormap={setColormapId}
          syncScroll={syncScroll}
          onToggleSyncScroll={onToggleSyncScroll}
          scoutLinesActive={scoutLinesActive}
          onToggleScoutLines={onToggleScoutLines}
          onInvert={onInvert}
          onReset={onReset}
          onExport={onExport}
          gridRows={gridRows}
          gridCols={gridCols}
          onSelectGrid={onSelectGrid}
          is3DActive={is3D}
          onToggle3D={toggle3D}
          modality={study.modality}
          onUploadGoogleDrive={props.onUploadGoogleDrive}
          uploadingGoogleDrive={props.uploadingGoogleDrive}
        />

        {/* Awaiting PACS DICOM Transfer Badge */}
        {!isLocalCase && (!localSeries || localSeries.length === 0) && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container/90 border border-outline-variant/80 text-[10px] text-secondary shadow-md backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Awaiting PACS DICOM transfer &bull; Reporting mode active</span>
            </div>
          </div>
        )}

        {is3D ? (
          <Zen3DVolumeStage
            localCaseId={localCaseId}
            seriesList={seriesList}
            activeSeriesIndex={activeSeriesIndex}
            onSelectSeries={onSelectSeries}
            currentSeries={currentSeries}
            modality={study.modality}
            onClose={toggle3D}
          />
        ) : isMultiPane ? (
          <StitchQuadGrid
            accessionNumber={study.accessionNumber}
            modality={study.modality}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            localSeries={localSeries}
            activeSeriesIndex={activeSeriesIndex}
            seriesSelectToken={seriesSelectToken}
            onActiveSeriesChange={onActiveSeriesChange}
            paneSeriesMap={paneSeriesMap}
            onUpdatePaneSeries={onUpdatePaneSeries}
            tool={tool}
            preset={preset}
            syncScroll={syncScroll}
            scoutLinesActive={scoutLinesActive}
            invert={invert}
            resetKey={resetKey}
            rows={gridRows}
            cols={gridCols}
          />
        ) : (
          <div
            onDragOver={handleSingleDragOver}
            onDragLeave={handleSingleDragLeave}
            onDrop={handleSingleDrop}
            className={`w-full h-full relative transition-all ${
              isDragOverSingle ? 'ring-4 ring-primary ring-inset' : ''
            }`}
          >
            <ZenDicomViewer
              accessionNumber={study.accessionNumber}
              modality={study.modality}
              isLocalCase={isLocalCase}
              localCaseId={localCaseId}
              localSeries={localSeries}
              activeSeriesIndex={paneSeriesMap[0] ?? activeSeriesIndex}
              tool={tool}
              preset={preset}
              colormapId={colormapId}
              isCinePlaying={isCinePlaying}
              onToggleCine={onToggleCine}
              invert={invert}
              resetKey={resetKey}
            />
          </div>
        )}
      </div>
    </div>
  );
}
