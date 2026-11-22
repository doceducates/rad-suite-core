'use client';

import React from 'react';
import { StitchSeriesItem } from './stitch-filmstrip';
import { ZenSeriesCard } from './zen-series-card';
import { ZenSeriesThumbnail } from './zen-series-thumbnail';
import { resolveOrientationBadge } from '@/hooks/use-series-progress';
import { PanelLeftClose, PanelLeftOpen, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZenSeriesColumnProps {
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  onSelectSeries: (index: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  invert?: boolean;
}

export function ZenSeriesColumn({
  seriesList,
  activeSeriesIndex,
  onSelectSeries,
  isCollapsed,
  onToggleCollapse,
  width,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  invert = false,
}: ZenSeriesColumnProps) {
  // Collapsed Mode: slim rail with medical sequence thumbnails (Axial, Sagittal, Coronal)
  if (isCollapsed) {
    return (
      <div className="w-[52px] h-full bg-surface-container-low border-r border-outline-variant/50 flex flex-col items-center py-2 shrink-0 select-none transition-all duration-200">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors mb-2"
          title="Expand Series Rail"
        >
          <PanelLeftOpen className="w-4 h-4 text-primary" />
        </button>

        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto w-full px-1 items-center scrollbar-none">
          {seriesList.map((s, idx) => {
            const isSelected = idx === activeSeriesIndex;
            const badge = resolveOrientationBadge(s.orientation, s.seriesDescription);
            const sNum = s.seriesNumber || String(idx + 1);

            return (
              <button
                key={`collapsed-series-${(s as any).seriesInstanceUid || s.seriesNumber || 'series'}-${idx}`}
                type="button"
                onClick={() => onSelectSeries(idx)}
                title={`${s.seriesDescription || 'Series'} (${badge.label}) • #${sNum} • ${s.sliceCount} imgs`}
                className={cn(
                  'group relative w-10 h-10 rounded-lg overflow-hidden border transition-all shrink-0 flex items-center justify-center bg-black cursor-pointer',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/60 shadow-sm'
                    : 'border-outline-variant/50 hover:border-outline hover:ring-1 hover:ring-outline/50 opacity-85 hover:opacity-100'
                )}
              >
                <ZenSeriesThumbnail
                  series={s}
                  index={idx}
                  modality={modality}
                  isLocalCase={isLocalCase}
                  localCaseId={localCaseId}
                  invert={invert}
                  width={40}
                  height={40}
                />

                {/* Corner Orientation Pill (e.g. AX, SAG, COR, LOC) */}
                <span className="absolute bottom-0.5 right-0.5 px-0.5 py-0 rounded text-[7px] font-mono font-bold bg-black/85 text-white/90 pointer-events-none leading-tight border border-white/10">
                  {badge.label}
                </span>

                {/* Corner Series Number */}
                <span className="absolute top-0.5 left-0.5 px-0.5 py-0 rounded text-[6.5px] font-mono text-white/70 bg-black/75 pointer-events-none leading-tight">
                  #{sNum}
                </span>

                {/* Active Indicator Top Edge */}
                {isSelected && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded Mode: Full RadiAnt/Vitrea-inspired series column
  return (
    <div
      style={{ width: `${width}px` }}
      className="h-full bg-surface-container-low border-r border-outline-variant/50 flex flex-col shrink-0 select-none overflow-hidden transition-all duration-150"
    >
      {/* Column Header */}
      <div className="h-10 px-3 bg-surface-container flex items-center justify-between border-b border-outline-variant/40 shrink-0">
        <div className="flex items-center gap-1.5 font-headline font-bold text-xs text-on-surface">
          <Film className="w-3.5 h-3.5 text-primary" />
          <span>Series ({seriesList.length})</span>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
          title="Collapse Series Rail"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Series Cards Stack */}
      <div className="flex-1 p-2 overflow-y-auto space-y-2">
        {seriesList.map((s, idx) => (
          <ZenSeriesCard
            key={`series-card-${(s as any).seriesInstanceUid || s.seriesNumber || 'series'}-${idx}`}
            series={s}
            index={idx}
            isSelected={idx === activeSeriesIndex}
            onSelect={onSelectSeries}
            modality={modality}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            invert={invert}
          />
        ))}
      </div>
    </div>
  );
}
