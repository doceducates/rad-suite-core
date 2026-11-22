'use client';

import React from 'react';
import { getOrientationMarkers } from '@/services/dicom-geometry.service';
import { ZenDicomBottomRightWl } from './zen-dicom-bottom-right-wl';
import type { ClinicalPreset, DicomSequenceMeta } from '@/services/clinical-presets.service';

interface ZenDicomHudProps {
  patientName: string;
  patientId: string;
  modality: string;
  seriesLabel: string;
  seriesNumber: number;
  slice: number;
  maxSlices: number;
  orient: string;
  ww: number;
  wc: number;
  zoom: number;
  hoverHu?: {
    hu: number;
    raw: number;
    px: number;
    py: number;
    tissueLabel: string;
    tissueColor: string;
  } | null;
  iop?: number[];
  source?: 'local' | 's3' | 'pacs' | 'edge';
  activePresetId?: string;
  pixelData?: ArrayLike<number>;
  seriesMeta?: DicomSequenceMeta;
  onSelectPreset?: (preset: ClinicalPreset) => void;
  onWwWcChange?: (ww: number, wc: number) => void;
  onToggleInvert?: () => void;
  invert?: boolean;
}

export function ZenDicomHud({
  patientName,
  patientId,
  modality,
  seriesLabel,
  seriesNumber,
  slice,
  maxSlices,
  orient,
  ww,
  wc,
  zoom,
  hoverHu,
  iop,
  source,
  activePresetId,
  pixelData,
  seriesMeta,
  onSelectPreset,
  onWwWcChange,
  onToggleInvert,
  invert,
}: ZenDicomHudProps) {
  const markers = getOrientationMarkers(orient, iop);

  return (
    <>
      {/* Direction Markers */}
      <span className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none">
        {markers.top}
      </span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none">
        {markers.bottom}
      </span>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none">
        {markers.left}
      </span>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none">
        {markers.right}
      </span>

      {/* Top-Left Corner HUD: Patient Name, ID & Streaming Source */}
      <div className="absolute top-2 left-3 flex flex-col font-mono text-[10px] leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none max-w-[220px]">
        <span className="font-bold text-[#8ecf9e] text-[11px] truncate">{patientName}</span>
        <span className="text-neutral-400 text-[10px] truncate">{patientId}</span>
        {source === 'edge' && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40 w-fit mt-1">
            📡 CLINIC EDGE STREAM
          </span>
        )}
        {source === 's3' && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider bg-primary/25 text-primary border border-primary/40 w-fit mt-1">
            ☁️ S3 CLOUD CACHED
          </span>
        )}
      </div>

      {/* Top-Right Corner HUD: Series / Sequence Name (e.g. T1, T2, etc.) */}
      <div className="absolute top-2 right-3 flex flex-col items-end font-mono text-[10px] leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none max-w-[200px]">
        <span className="font-bold text-[#8ecf9e] uppercase text-[11px] truncate">{seriesLabel}</span>
        <span className="text-neutral-400 text-[10px]">{orient} · #{seriesNumber}</span>
      </div>

      {/* Bottom-Left Corner HUD: Slice Position & Dynamic HU Value */}
      <div className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 flex flex-col font-mono text-[10px] leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none">
        <div className="flex items-center gap-1 font-bold text-[#8ecf9e]">
          <span>IM: {slice + 1} / {maxSlices}</span>
        </div>
        {hoverHu && (
          <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-[11px]">
            <span
              className="px-1.5 py-0.5 rounded bg-black/70 border border-white/10 shadow-sm"
              style={{ color: hoverHu.tissueColor }}
            >
              {hoverHu.hu >= 0 ? `+${hoverHu.hu}` : hoverHu.hu} HU
            </span>
            <span className="text-neutral-300 font-medium text-[10px]">
              {hoverHu.tissueLabel}
            </span>
          </div>
        )}
      </div>

      {/* Bottom-Right Corner HUD: Interactive Vitrea Window/Level & Zoom */}
      <ZenDicomBottomRightWl
        ww={ww}
        wc={wc}
        zoom={zoom}
        modality={modality}
        activePresetId={activePresetId}
        pixelData={pixelData}
        seriesMeta={seriesMeta}
        onSelectPreset={onSelectPreset}
        onWwWcChange={onWwWcChange}
        onToggleInvert={onToggleInvert}
        invert={invert}
      />
    </>
  );
}
