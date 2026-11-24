'use client';

// Layer 4 (Presentation): Unified Left Pane Diagnostic Column (<100 lines)
// Integrates canonical ZenDicomViewportContainer for 100% feature parity across all view modes

import React from 'react';
import { type StitchSeriesItem } from './stitch-filmstrip';
import { ZenWorkstationStandby, StandbyCaseItem } from './zen-workstation-standby';
import { ZenDicomViewportContainer } from './zen-dicom-viewport-container';
import type { DicomTool } from '@/types/viewport';

export interface ZenLeftPaneColumnProps {
  study: any;
  isLocalCase: boolean;
  localCaseId?: string;
  localSeries?: any[];
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  seriesSelectToken?: number;
  onSelectSeries: (idx: number) => void;
  onActiveSeriesChange?: (seriesIndex: number) => void;
  paneSeriesMap?: Record<number, number>;
  onUpdatePaneSeries?: (paneIdx: number, seriesIdx: number) => void;
  tool?: DicomTool;
  onSelectTool?: (tool: DicomTool) => void;
  preset?: string;
  onSelectPreset?: (preset: string) => void;
  isCinePlaying?: boolean;
  onToggleCine?: () => void;
  syncScroll?: boolean;
  onToggleSyncScroll?: () => void;
  scoutLinesActive?: boolean;
  onToggleScoutLines?: () => void;
  onInvert?: () => void;
  onReset?: () => void;
  cadActive?: boolean;
  onToggleCad?: () => void;
  onExport?: () => void;
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

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
      <ZenDicomViewportContainer
        accessionNumber={props.study?.accessionNumber || ''}
        modality={props.study?.modality || 'CT'}
        isLocalCase={props.isLocalCase}
        localCaseId={props.localCaseId}
        localSeries={props.localSeries}
        seriesList={props.seriesList}
        activeSeriesIndex={props.activeSeriesIndex}
        onSelectSeries={props.onSelectSeries}
        isCompanion={false}
      />
    </div>
  );
}
