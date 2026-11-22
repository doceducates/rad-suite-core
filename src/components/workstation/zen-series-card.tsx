'use client';

import React from 'react';
import { StitchSeriesItem } from './stitch-filmstrip';
import { ZenSeriesThumbnail } from './zen-series-thumbnail';
import { useSeriesProgress, resolveOrientationBadge } from '@/hooks/use-series-progress';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZenSeriesCardProps {
  series: StitchSeriesItem;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  invert?: boolean;
}

export function ZenSeriesCard({
  series,
  index,
  isSelected,
  onSelect,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  invert = false,
}: ZenSeriesCardProps) {
  const sNum = series.seriesNumber || String(index + 1);
  const total = series.sliceCount ?? 0;
  const progress = useSeriesProgress(localCaseId, sNum, total);
  const badgeConfig = resolveOrientationBadge(series.orientation, series.seriesDescription);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Series ${sNum}: ${series.seriesDescription || 'Series'}, ${progress.loaded} of ${progress.total} slices loaded`}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.setData('application/rad-series-index', String(index));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onSelect(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(index);
        }
      }}
      className={cn(
        'group relative flex flex-col p-1.5 rounded-xl cursor-pointer select-none transition-all duration-150 border overflow-hidden',
        isSelected
          ? 'bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary/40'
          : 'bg-surface-container/60 hover:bg-surface-container border-outline-variant/40 hover:border-outline'
      )}
      title={`Series ${sNum}: ${series.seriesDescription || 'Series'} • Click to open in PiP`}
    >
      {/* 1. Thumbnail Viewport Tile (RadiAnt / Vitrea Style) */}
      <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border border-outline-variant/30 flex items-center justify-center">
        <ZenSeriesThumbnail
          series={series}
          index={index}
          modality={modality}
          isLocalCase={isLocalCase}
          localCaseId={localCaseId}
          invert={invert}
        />

        {/* Top-left: Series Index Pill */}
        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs pointer-events-none">
          #{sNum}
        </span>

        {/* Top-right: Modality */}
        <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-primary/20 text-primary border border-primary/30 pointer-events-none">
          {series.modality || modality}
        </span>

        {/* Bottom indicator if active in PiP */}
        {isSelected && (
          <div className="absolute bottom-1 inset-x-1 py-0.5 rounded bg-primary/90 text-[8px] font-mono font-bold text-primary-foreground text-center tracking-wider uppercase flex items-center justify-center gap-1 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Active PiP
          </div>
        )}

        {/* Sequence Progress Bar along bottom of thumbnail */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-black/60 overflow-hidden pointer-events-none">
          <div
            className={cn(
              'h-full transition-all duration-300',
              progress.isComplete
                ? 'bg-emerald-500'
                : progress.loaded > 0
                ? 'bg-primary'
                : 'bg-transparent'
            )}
            style={{ width: `${progress.loaded > 0 ? Math.max(progress.percent, 4) : 0}%` }}
          />
        </div>
      </div>

      {/* 2. Series Metadata & Labels */}
      <div className="mt-1.5 px-0.5 flex flex-col gap-0.5 min-w-0">
        <span
          className={cn(
            'text-[11px] font-semibold truncate leading-tight',
            isSelected ? 'text-primary' : 'text-on-surface'
          )}
        >
          {series.seriesDescription || `Series #${sNum}`}
        </span>

        <div className="flex items-center justify-between text-[10px] text-secondary font-mono mt-0.5">
          {/* Anatomical Orientation Badge */}
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border',
              badgeConfig.badgeClassName
            )}
            title={`Orientation: ${badgeConfig.type}`}
          >
            {badgeConfig.label}
          </span>

          {/* Real-time Loaded / Total Slice Counter */}
          {progress.loaded > 0 ? (
            <span
              className={cn(
                'font-mono text-[10px] font-bold flex items-center gap-1',
                progress.isComplete
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-primary animate-pulse'
              )}
            >
              {progress.isComplete && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              {progress.loaded}/{progress.total}
            </span>
          ) : localCaseId ? (
            <span className="font-mono text-[10px] text-secondary">
              0/{progress.total}
            </span>
          ) : (
            <span className="font-semibold text-primary/80">
              {series.sliceCount ?? 0} imgs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
