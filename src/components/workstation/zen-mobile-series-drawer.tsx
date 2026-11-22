'use client';

import React from 'react';
import { ZenSeriesThumbnail } from './zen-series-thumbnail';
import { resolveOrientationBadge } from '@/hooks/use-series-progress';
import { X, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StitchSeriesItem } from './stitch-filmstrip';

interface ZenMobileSeriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  onSelectSeries: (index: number) => void;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  invert?: boolean;
}

export function ZenMobileSeriesDrawer({
  isOpen,
  onClose,
  seriesList,
  activeSeriesIndex,
  onSelectSeries,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  invert = false,
}: ZenMobileSeriesDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop tap to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Up Bottom Sheet */}
      <div className="w-full bg-neutral-900 border-t border-white/15 rounded-t-2xl max-h-[75vh] flex flex-col shadow-2xl overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        {/* Grab Handle */}
        <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mt-2.5 mb-1.5 shrink-0" />

        {/* Drawer Header */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-white tracking-wide">
              Series &amp; Sequences ({seriesList.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Series Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2.5">
          {seriesList.map((series, idx) => {
            const isSelected = idx === activeSeriesIndex;
            const badge = resolveOrientationBadge(series.orientation, series.seriesDescription);
            const sNum = series.seriesNumber || String(idx + 1);

            return (
              <button
                key={`mobile-drawer-series-${(series as any).seriesInstanceUid || sNum}-${idx}`}
                type="button"
                onClick={() => {
                  onSelectSeries(idx);
                  onClose();
                }}
                className={cn(
                  'flex flex-col p-2 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden',
                  isSelected
                    ? 'bg-neutral-800 border-primary ring-2 ring-primary/60 shadow-md'
                    : 'bg-neutral-950/80 border-white/10 hover:border-white/20'
                )}
              >
                {/* Thumbnail Preview Tile */}
                <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center mb-1.5">
                  <ZenSeriesThumbnail
                    series={series}
                    index={idx}
                    modality={modality}
                    isLocalCase={isLocalCase}
                    localCaseId={localCaseId}
                    invert={invert}
                    width={90}
                    height={90}
                  />

                  {/* Corner Orientation Badge */}
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-black/80 text-white border border-white/10">
                    {badge.label}
                  </span>

                  {/* Series Number */}
                  <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[7.5px] font-mono text-white/80 bg-black/80">
                    #{sNum}
                  </span>

                  {/* Active Indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Series Metadata */}
                <span className="text-[11px] font-semibold text-white truncate w-full">
                  {series.seriesDescription || `Series ${sNum}`}
                </span>
                <div className="flex items-center gap-1.5 text-[9.5px] text-white/50 font-mono mt-0.5">
                  <span>{series.sliceCount} imgs</span>
                  {series.sliceThickness && (
                    <>
                      <span>&bull;</span>
                      <span>{series.sliceThickness}mm</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
