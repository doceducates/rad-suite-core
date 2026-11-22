'use client';

import React from 'react';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { RadiantGridDropdown } from './radiant-grid-dropdown';
import { ClinicalPresetSelector } from './clinical-preset-selector';
import { VitreaApplicationSelector } from './vitrea-application-selector';
import type { ClinicalApplication } from '@/services/clinical-applications.service';
import { ToolbarActionButtons } from './toolbar-action-buttons';

interface StitchClinicalToolbarProps {
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  preset: string;
  onSelectPreset: (preset: string) => void;
  isCinePlaying?: boolean;
  onToggleCine?: () => void;
  onStepSlice?: (dir: -1 | 1) => void;
  syncScroll: boolean;
  onToggleSyncScroll: () => void;
  scoutLinesActive?: boolean;
  onToggleScoutLines?: () => void;
  onInvert: () => void;
  onReset: () => void;
  cadActive?: boolean;
  onToggleCad?: () => void;
  onExport: () => void;
  onUploadGoogleDrive?: () => void;
  uploadingGoogleDrive?: boolean;
  gridRows?: number;
  gridCols?: number;
  onSelectGrid?: (rows: number, cols: number) => void;
  is3DActive?: boolean;
  onToggle3D?: () => void;
  modality?: string;
  studyDescription?: string;
  bodyPartExamined?: string;
  seriesCount?: number;
  activeAppId?: string;
  onSelectApp?: (app: ClinicalApplication) => void;
}

const NAV_TOOLS: { id: DicomTool; icon: string; title: string }[] = [
  { id: 'pan', icon: 'drag_pan', title: 'Pan (P) · Hold Spacebar to Pan' },
  { id: 'zoom', icon: 'zoom_in', title: 'Zoom (Z) · Ctrl+Wheel over image' },
  { id: 'wl', icon: 'exposure', title: 'Window/Level (W)' },
];

const MEASURE_TOOLS: { id: DicomTool; icon: string; title: string }[] = [
  { id: 'length', icon: 'straighten', title: 'Length Caliper (L)' },
  { id: 'angle', icon: 'square_foot', title: 'Angle / Cobb Angle (A)' },
  { id: 'roi', icon: 'radio_button_unchecked', title: 'ROI Density (E)' },
  { id: 'crosshair', icon: 'filter_center_focus', title: '3D Cursor / Locate Point (Q)' },
];

export function StitchClinicalToolbar(props: StitchClinicalToolbarProps) {
  const {
    activeTool, onSelectTool, preset, onSelectPreset,
    syncScroll, onToggleSyncScroll, scoutLinesActive = true, onToggleScoutLines,
    onInvert, onReset, onExport,
    gridRows = 1, gridCols = 1, onSelectGrid, is3DActive = false, onToggle3D,
  } = props;

  const toolbarRef = React.useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && toolbarRef.current) {
      toolbarRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      ref={toolbarRef}
      onWheel={handleWheel}
      className="relative z-40 h-9 pl-3.5 pr-2 bg-surface-container flex items-center justify-between border-b border-outline-variant/40 text-on-surface text-[12px] gap-2 select-none shrink-0 shadow-xs overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Left Tools Cluster */}
      <div className="flex items-center gap-1.5 shrink-0 min-w-max">
        {/* Modality Clinical Application Directory */}
        <VitreaApplicationSelector
          modality={props.modality || 'CT'}
          studyDescription={props.studyDescription}
          bodyPartExamined={props.bodyPartExamined}
          seriesCount={props.seriesCount}
          activeAppId={props.activeAppId}
          onSelectApp={(app) => {
            if (props.onSelectApp) props.onSelectApp(app);
            if (app.layout && props.onSelectGrid) {
              props.onSelectGrid(app.layout.rows, app.layout.cols);
            }
            if ((app.is3D || app.isMpr) && !props.is3DActive && props.onToggle3D) {
              props.onToggle3D();
            } else if (!app.is3D && !app.isMpr && props.is3DActive && props.onToggle3D) {
              props.onToggle3D();
            }
          }}
        />

        <div className="h-4 w-px bg-outline-variant/50" />

        {/* Preset Selector with breathing room */}
        <div className="flex items-center">
          <ClinicalPresetSelector preset={preset} onSelectPreset={onSelectPreset} modality={props.modality} />
        </div>

        <div className="h-4 w-px bg-outline-variant/50" />

        {/* Navigation Tools (Pan, Zoom, W/L) */}
        <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/40">
          {NAV_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTool(t.id)}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                activeTool === t.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
              title={t.title}
            >
              <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-outline-variant/50" />

        {/* Measurement Calipers (Length, Cobb Angle, ROI, Crosshair) */}
        <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/40">
          {MEASURE_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTool(t.id)}
              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                activeTool === t.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
              title={t.title}
            >
              <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-outline-variant/50 hidden sm:block" />

        {/* RadiAnt Multi-Pane Grid Selector */}
        {onSelectGrid && (
          <RadiantGridDropdown
            rows={gridRows}
            cols={gridCols}
            onSelectGrid={onSelectGrid}
          />
        )}

        {/* 3D Volume Raymarching Studio */}
        {onToggle3D && (
          <button
            type="button"
            onClick={onToggle3D}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
              is3DActive
                ? 'bg-primary text-white shadow-2xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
            title={is3DActive ? '3D Studio (VRT / MIP): Active' : 'Switch to 3D Volume Raymarching Studio'}
          >
            <span className="material-symbols-outlined text-[15px]">view_in_ar</span>
            {is3DActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary-fixed ring-1 ring-surface" />
            )}
          </button>
        )}

        {/* Plane-Aware Synchronized Scrolling (Icon only with status glow) */}
        <button
          type="button"
          onClick={onToggleSyncScroll}
          className={`w-6 h-6 flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
            syncScroll
              ? 'bg-primary text-white shadow-2xs'
              : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
          }`}
          title={syncScroll ? 'Synchronized Scrolling: ON (Plane-Aware)' : 'Synchronized Scrolling: OFF'}
        >
          <span className="material-symbols-outlined text-[14px]">link</span>
          {syncScroll && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-surface animate-pulse" />
          )}
        </button>

        {/* 3D Scout Lines Toggle (Icon only with status glow) */}
        {onToggleScoutLines && (
          <button
            type="button"
            onClick={onToggleScoutLines}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
              scoutLinesActive
                ? 'bg-primary text-white shadow-2xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
            }`}
            title={scoutLinesActive ? '3D Scout Localizer Lines: ON' : '3D Scout Lines: OFF'}
          >
            <span className="material-symbols-outlined text-[14px]">insights</span>
            {scoutLinesActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-surface" />
            )}
          </button>
        )}

        {/* Invert Grayscale & Reset Viewport */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onInvert}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="Invert Grayscale (I)"
          >
            <span className="material-symbols-outlined text-[15px]">invert_colors</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="Reset Viewport & Contrast (R)"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
          </button>
        </div>
      </div>

      {/* Right Quick Actions */}
      <div className="shrink-0 flex items-center min-w-max ml-1">
        <ToolbarActionButtons
          onExport={onExport}
          onUploadGoogleDrive={props.onUploadGoogleDrive}
          uploadingGoogleDrive={props.uploadingGoogleDrive}
        />
      </div>
    </div>
  );
}
