'use client';

import React from 'react';
import { Layers, Maximize2, Minimize2, MoreHorizontal } from 'lucide-react';
import type { ViewportLayoutMode } from '@/types/viewport';
import { WINDOW_PRESETS } from '@/services/dicom.service';
import { cn } from '@/lib/utils';

interface DicomMobileTopBarProps {
  series: any[];
  activeSeriesIndex: number;
  onSelectSeries: (idx: number) => void;
  preset: string;
  onSelectPreset: (preset: string) => void;
  layout: ViewportLayoutMode;
  onOpenLayoutModal: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenMoreActions: () => void;
  activePaneIndex?: number;
  totalPanes?: number;
}

export function DicomMobileTopBar({
  series,
  activeSeriesIndex,
  onSelectSeries,
  preset,
  onSelectPreset,
  layout,
  onOpenLayoutModal,
  isFullscreen,
  onToggleFullscreen,
  onOpenMoreActions,
  activePaneIndex = 0,
  totalPanes = 1,
}: DicomMobileTopBarProps) {
  const currentSeries = series[activeSeriesIndex] || series[0];
  const orient = currentSeries?.orientation || 'AXIAL';
  const orientBadge = orient === 'AXIAL' ? 'AX' : orient === 'CORONAL' ? 'COR' : 'SAG';

  return (
    <div className="h-10 px-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-1.5 text-xs text-white select-none shrink-0 z-20">
      {/* Left: Sequence Selector */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-[42%]">
        <select
          value={activeSeriesIndex}
          onChange={(e) => onSelectSeries(Number(e.target.value))}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-[11px] font-medium text-primary focus:outline-none focus:border-primary truncate cursor-pointer"
        >
          {series.map((s, idx) => (
            <option key={s.id || idx} value={idx} className="bg-zinc-900 text-zinc-100">
              {s.description || `Series ${idx + 1}`}
            </option>
          ))}
        </select>
        <span className="hidden min-[380px]:inline-block px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-primary/20 text-primary border border-primary/30 shrink-0">
          {orientBadge}
        </span>
      </div>

      {/* Center: Layout Pill */}
      <button
        type="button"
        onClick={onOpenLayoutModal}
        className={cn(
          "px-2 py-1 rounded-md text-[11px] font-mono font-bold border transition-colors flex items-center gap-1 shrink-0 cursor-pointer",
          layout !== '1x1'
            ? "bg-primary/20 text-primary border-primary/40 shadow-xs"
            : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
        )}
        title="Tap to switch multi-pane layout"
      >
        <span>{layout}</span>
        {totalPanes > 1 && (
          <span className="text-[10px] text-primary font-semibold">P{activePaneIndex + 1}</span>
        )}
      </button>

      {/* Right Controls: Preset, Fullscreen, More */}
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={preset}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 focus:outline-none focus:border-primary max-w-[85px] truncate cursor-pointer"
          title="Clinical Window Preset"
        >
          {Object.entries(WINDOW_PRESETS).map(([key, val]) => (
            <option key={key} value={key} className="bg-zinc-900 text-zinc-100">
              {val.label}
            </option>
          ))}
        </select>

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenMoreActions}
          className="p-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="More Actions & Tools"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
