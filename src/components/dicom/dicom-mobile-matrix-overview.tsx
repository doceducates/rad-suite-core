'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DicomMobileMatrixOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  totalPanes: number;
  activePaneIndex: number;
  rows: number;
  cols: number;
  seriesList: any[];
  cellSeriesMap?: Record<number, number>;
  onSelectPane: (idx: number) => void;
}

export function DicomMobileMatrixOverview({
  isOpen,
  onClose,
  totalPanes,
  activePaneIndex,
  rows,
  cols,
  seriesList,
  cellSeriesMap = {},
  onSelectPane,
}: DicomMobileMatrixOverviewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">Matrix Overview</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono text-xs font-semibold">
              {rows}×{cols} ({totalPanes} Panes)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overview Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(cols, 4)}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: totalPanes }, (_, idx) => {
              const isActive = idx === activePaneIndex;
              const seriesIdx = cellSeriesMap[idx] ?? (idx % Math.max(1, seriesList.length));
              const s = seriesList[seriesIdx] || seriesList[0] || {};
              const orient = s.orientation || 'AXIAL';
              const orientBadge = orient === 'AXIAL' ? 'AX' : orient === 'CORONAL' ? 'COR' : 'SAG';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectPane(idx);
                    onClose();
                  }}
                  className={cn(
                    'p-2 rounded-xl text-left flex flex-col justify-between transition-all border cursor-pointer group min-h-[75px]',
                    isActive
                      ? 'bg-primary/15 border-primary ring-2 ring-primary/30 text-white shadow-lg'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-bold text-xs text-primary">P{idx + 1}</span>
                    {isActive ? (
                      <span className="w-4 h-4 rounded-full bg-primary text-zinc-950 flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-zinc-800 text-zinc-400">
                        {orientBadge}
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    <p className="text-[10px] font-medium text-zinc-200 truncate leading-tight">
                      {s.description || `Series ${seriesIdx + 1}`}
                    </p>
                    <p className="text-[9px] font-mono text-zinc-500 mt-0.5">
                      {s.instances?.length || s.sliceCount || 24} imgs
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer instruction */}
        <div className="px-4 py-2.5 bg-zinc-900/40 border-t border-zinc-800/80 text-center text-[11px] text-zinc-400">
          Tap any pane to focus and inspect in full resolution
        </div>
      </div>
    </div>
  );
}
