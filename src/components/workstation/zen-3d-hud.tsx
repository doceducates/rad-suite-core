'use client';

import React from 'react';
import { VolumePreset } from '@/hooks/use-three-volume-renderer';

export type StudioRenderMode = '3d-volume' | 'mpr-triplanar';

interface Zen3DHudProps {
  renderMode: StudioRenderMode;
  onSelectRenderMode: (mode: StudioRenderMode) => void;
  preset: VolumePreset;
  onSelectPreset: (preset: VolumePreset) => void;
  seriesList?: any[];
  activeSeriesIndex: number;
  onSelectSeries?: (index: number) => void;
  currentSeriesName: string;
  totalSlices: number;
  onClose?: () => void;
}

export function Zen3DHud({
  renderMode,
  onSelectRenderMode,
  preset,
  onSelectPreset,
  seriesList = [],
  activeSeriesIndex,
  onSelectSeries,
  currentSeriesName,
  totalSlices,
  onClose,
}: Zen3DHudProps) {
  return (
    <>
      {/* Top Left: Mode Switcher & Series Selector */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-surface-container-highest/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-outline-variant/50 shadow-xl">
        {/* Mode Switcher: 3D VRT vs Tri-Planar MPR */}
        <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/40">
          <button
            type="button"
            onClick={() => onSelectRenderMode('3d-volume')}
            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
              renderMode === '3d-volume'
                ? 'bg-primary text-white shadow-2xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
            title="3D Volume Raymarching (VRT / MIP)"
          >
            <span className="material-symbols-outlined text-[13px]">view_in_ar</span>
            3D Volume
          </button>
          <button
            type="button"
            onClick={() => onSelectRenderMode('mpr-triplanar')}
            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
              renderMode === 'mpr-triplanar'
                ? 'bg-primary text-white shadow-2xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
            title="Multi-Planar Reconstruction (Axial, Coronal, Sagittal)"
          >
            <span className="material-symbols-outlined text-[13px]">grid_view</span>
            MPR Orthogonal
          </button>
        </div>

        <span className="h-4 w-px bg-outline-variant/60" />

        {/* Series Selector Dropdown */}
        {seriesList.length > 0 && onSelectSeries ? (
          <select
            value={activeSeriesIndex}
            onChange={(e) => onSelectSeries(Number(e.target.value))}
            className="bg-surface-container-low border border-outline-variant/50 rounded-lg px-2 py-0.5 text-[11px] font-mono font-semibold text-on-surface focus:outline-hidden focus:border-primary cursor-pointer max-w-[140px] truncate"
            title="Switch Source Series (Axial, Sagittal, Coronal)"
          >
            {seriesList.map((s, idx) => (
              <option key={s.id || idx} value={idx}>
                #{s.seriesNumber || idx + 1} {s.seriesDescription || s.description || `Series ${idx + 1}`}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-mono text-[11px] text-secondary">
            {currentSeriesName} ({totalSlices} sl)
          </span>
        )}
      </div>

      {/* Top Right: Preset Buttons (in 3D mode) & Close */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-surface-container-highest/85 backdrop-blur-md p-1.5 rounded-xl border border-outline-variant/50 shadow-xl">
        {renderMode === '3d-volume' &&
          (['bone', 'vascular', 'abdominal', 'lung', 'brain', 'mip'] as VolumePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onSelectPreset(p)}
              className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                preset === p
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {p === 'mip' ? 'MIP' : p}
            </button>
          ))}

        {onClose && (
          <>
            <span className="h-4 w-px bg-outline-variant/60 mx-0.5" />
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              title="Close 3D View"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
