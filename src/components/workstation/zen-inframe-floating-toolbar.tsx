'use client';

import React from 'react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import { ZenMeasurementFlyout } from './zen-measurement-flyout';
import { DicomColormapDropdown } from './dicom-colormap-dropdown';
import { ClinicalPresetSelector } from './clinical-preset-selector';
import { RadiantGridDropdown } from './radiant-grid-dropdown';
import { ToolbarActionButtons } from './toolbar-action-buttons';
import { cn } from '@/lib/utils';

export interface ZenInframeFloatingToolbarProps {
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  preset: string;
  onSelectPreset: (preset: string) => void;
  activeColormapId: string;
  onSelectColormap: (id: string) => void;
  syncScroll: boolean;
  onToggleSyncScroll: () => void;
  scoutLinesActive?: boolean;
  onToggleScoutLines?: () => void;
  onInvert: () => void;
  onReset: () => void;
  onExport: () => void;
  gridRows?: number;
  gridCols?: number;
  onSelectGrid?: (rows: number, cols: number) => void;
  is3DActive?: boolean;
  onToggle3D?: () => void;
  modality?: string;
  measurementsCount?: number;
  onClearMeasurements?: () => void;
  onUploadGoogleDrive?: () => void;
  uploadingGoogleDrive?: boolean;
  className?: string;
}

const NAV_TOOLS: { id: DicomTool; icon: string; title: string }[] = [
  { id: 'pan', icon: 'drag_pan', title: 'Pan (P) · Hold Spacebar to Pan' },
  { id: 'zoom', icon: 'zoom_in', title: 'Zoom (Z) · Ctrl+Wheel over image' },
  { id: 'wl', icon: 'exposure', title: 'Window/Level (W)' },
  { id: 'crosshair', icon: 'filter_center_focus', title: '3D Cursor / Locate Point (Q)' },
];

export function ZenInframeFloatingToolbar({
  activeTool,
  onSelectTool,
  preset,
  onSelectPreset,
  activeColormapId,
  onSelectColormap,
  syncScroll,
  onToggleSyncScroll,
  scoutLinesActive = true,
  onToggleScoutLines,
  onInvert,
  onReset,
  onExport,
  gridRows = 1,
  gridCols = 1,
  onSelectGrid,
  is3DActive = false,
  onToggle3D,
  modality = 'CT',
  measurementsCount = 0,
  onClearMeasurements,
  onUploadGoogleDrive,
  uploadingGoogleDrive,
  className,
}: ZenInframeFloatingToolbarProps) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute top-2.5 left-1/2 -translate-x-1/2 z-30 max-w-[96%] flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950/85 dark:bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl text-white select-none pointer-events-auto transition-all duration-200 overflow-x-auto [scrollbar-width:none]',
        className
      )}
    >
      {/* 1. Navigation Cluster */}
      <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10 shrink-0">
        {NAV_TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTool(t.id)}
            className={cn(
              'w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer',
              activeTool === t.id
                ? 'bg-primary text-white shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            )}
            title={t.title}
          >
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-white/15 shrink-0" />

      {/* 2. Grouped Measurement Flyout */}
      <ZenMeasurementFlyout
        activeTool={activeTool}
        onSelectTool={onSelectTool}
        onClearAll={onClearMeasurements}
        measurementsCount={measurementsCount}
      />

      <div className="h-4 w-px bg-white/15 shrink-0" />

      {/* 3. OHIF / vtk.js Colormaps */}
      <DicomColormapDropdown
        activeColormapId={activeColormapId}
        onSelectColormap={onSelectColormap}
      />

      {/* 4. Clinical W/L Presets */}
      <div className="hidden sm:inline-flex shrink-0">
        <ClinicalPresetSelector preset={preset} onSelectPreset={onSelectPreset} modality={modality} />
      </div>

      <div className="h-4 w-px bg-white/15 shrink-0 hidden sm:block" />

      {/* 5. RadiAnt Multi-Pane Grid Selector */}
      {onSelectGrid && (
        <div className="shrink-0">
          <RadiantGridDropdown rows={gridRows} cols={gridCols} onSelectGrid={onSelectGrid} />
        </div>
      )}

      {/* 6. 3D Studio Toggle */}
      {onToggle3D && (
        <button
          type="button"
          onClick={onToggle3D}
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded-md transition-all cursor-pointer relative shrink-0',
            is3DActive
              ? 'bg-primary text-white shadow-2xs'
              : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10'
          )}
          title={is3DActive ? '3D Studio (VRT / MIP): Active' : 'Switch to 3D Volume Studio'}
        >
          <span className="material-symbols-outlined text-[15px]">view_in_ar</span>
          {is3DActive && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-black" />
          )}
        </button>
      )}

      {/* 7. Plane-Aware Sync Scroll */}
      <button
        type="button"
        onClick={onToggleSyncScroll}
        className={cn(
          'w-6 h-6 flex items-center justify-center rounded-md transition-all cursor-pointer relative shrink-0',
          syncScroll
            ? 'bg-primary text-white shadow-2xs'
            : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10'
        )}
        title={syncScroll ? 'Synchronized Scrolling: ON' : 'Synchronized Scrolling: OFF'}
      >
        <span className="material-symbols-outlined text-[14px]">link</span>
        {syncScroll && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-black animate-pulse" />
        )}
      </button>

      {/* 8. 3D Scout Lines Toggle */}
      {onToggleScoutLines && (
        <button
          type="button"
          onClick={onToggleScoutLines}
          className={cn(
            'w-6 h-6 flex items-center justify-center rounded-md transition-all cursor-pointer relative shrink-0',
            scoutLinesActive
              ? 'bg-primary text-white shadow-2xs'
              : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10'
          )}
          title={scoutLinesActive ? '3D Scout Localizer Lines: ON' : '3D Scout Lines: OFF'}
        >
          <span className="material-symbols-outlined text-[14px]">insights</span>
          {scoutLinesActive && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-black" />
          )}
        </button>
      )}

      {/* 9. Invert & Reset */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onInvert}
          className="w-6 h-6 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Invert Grayscale (I)"
        >
          <span className="material-symbols-outlined text-[15px]">invert_colors</span>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-6 h-6 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Reset Viewport & Contrast (R)"
        >
          <span className="material-symbols-outlined text-[15px]">restart_alt</span>
        </button>
      </div>

      {/* 10. Snapshot / Drive Actions */}
      <div className="shrink-0 flex items-center ml-0.5">
        <ToolbarActionButtons
          onExport={onExport}
          onUploadGoogleDrive={onUploadGoogleDrive}
          uploadingGoogleDrive={uploadingGoogleDrive}
        />
      </div>
    </div>
  );
}
