'use client';

import React, { useState } from 'react';
import { resolveOrientationBadge } from '@/hooks/use-series-progress';
import { Layers, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StitchSeriesItem } from './stitch-filmstrip';
import { ZenMobileSeriesDrawer } from './zen-mobile-series-drawer';

interface ZenMobileSeriesBarProps {
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  onSelectSeries: (index: number) => void;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  invert?: boolean;
}

export function ZenMobileSeriesBar({
  seriesList,
  activeSeriesIndex,
  onSelectSeries,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  invert = false,
}: ZenMobileSeriesBarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!seriesList || seriesList.length === 0) return null;

  return (
    <>
      {/* Slim 34px Top Horizontal Chip Bar (Visible ONLY on mobile < md) */}
      <div className="md:hidden w-full h-9 bg-neutral-950/90 border-b border-white/10 flex items-center px-2 gap-1.5 shrink-0 z-30 select-none">
        {/* Horizontal Scrollable Chips Container */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {seriesList.map((series, idx) => {
            const isSelected = idx === activeSeriesIndex;
            const badge = resolveOrientationBadge(series.orientation, series.seriesDescription);
            const sNum = series.seriesNumber || String(idx + 1);

            return (
              <button
                key={`mobile-chip-${(series as any).seriesInstanceUid || sNum}-${idx}`}
                type="button"
                onClick={() => onSelectSeries(idx)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer border',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                    : 'bg-neutral-900/90 hover:bg-neutral-800 text-white/80 border-white/10 hover:border-white/20'
                )}
              >
                {/* Micro Orientation Badge */}
                <span
                  className={cn(
                    'px-1 py-0.2 rounded text-[7.5px] font-mono font-bold leading-tight uppercase',
                    isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-white/90'
                  )}
                >
                  {badge.label}
                </span>

                {/* Series Title */}
                <span className="truncate max-w-[110px]">
                  {series.seriesDescription || `Series ${sNum}`}
                </span>

                {/* Slice count badge */}
                <span className="text-[9px] opacity-75 font-mono">
                  ({series.sliceCount})
                </span>
              </button>
            );
          })}
        </div>

        {/* All Series Drawer Trigger Pill */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-white/90 border border-white/15 text-[10px] font-semibold shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
          title="Open All Series Drawer"
        >
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">All</span>
          <ChevronDown className="w-3 h-3 text-white/60" />
        </button>
      </div>

      {/* Slide-Up Mobile Series Drawer */}
      <ZenMobileSeriesDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        seriesList={seriesList}
        activeSeriesIndex={activeSeriesIndex}
        onSelectSeries={onSelectSeries}
        modality={modality}
        isLocalCase={isLocalCase}
        localCaseId={localCaseId}
        invert={invert}
      />
    </>
  );
}
