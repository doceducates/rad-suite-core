'use client';

import React from 'react';
import { ZenSeriesThumbnail } from './zen-series-thumbnail';
import { useSeriesProgress, resolveOrientationBadge } from '@/hooks/use-series-progress';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StitchSeriesItem {
  seriesNumber: string;
  seriesDescription: string;
  orientation?: string;
  sliceCount: number;
  sliceThickness?: string;
  modality?: string;
}

interface StitchFilmstripProps {
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  onSelectSeries: (index: number) => void;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  invert?: boolean;
}

interface StitchFilmstripItemProps {
  series: StitchSeriesItem;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  modality: string;
  isLocalCase: boolean;
  localCaseId?: string;
  invert: boolean;
}

const StitchFilmstripItem = React.memo(function StitchFilmstripItem({
  series,
  index,
  isSelected,
  onSelect,
  modality,
  isLocalCase,
  localCaseId,
  invert,
}: StitchFilmstripItemProps) {
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
        'group relative flex items-center gap-2 p-1.5 pb-2 rounded-xl select-none transition-all shrink-0 border overflow-hidden touch-manipulation cursor-pointer md:cursor-grab md:active:cursor-grabbing',
        isSelected
          ? 'bg-surface-container-lowest border-primary/60 ring-1 ring-primary/40 shadow-2xs'
          : 'bg-surface-container border-outline-variant/50 hover:border-outline'
      )}
      title={`Series #${sNum}: ${series.seriesDescription || 'Series'} • Click to view · Drag & drop to pane`}
    >
      {/* Thumbnail Square */}
      <div className="w-11 h-11 bg-black rounded-lg flex items-center justify-center text-primary-fixed-dim relative border border-outline-variant/40 overflow-hidden shrink-0">
        <ZenSeriesThumbnail
          series={series}
          index={index}
          modality={series.modality || modality}
          isLocalCase={isLocalCase}
          localCaseId={localCaseId}
          width={48}
          height={48}
          invert={invert}
        />
        {/* Top-right: Modality */}
        <span className="absolute top-0.5 right-0.5 text-[8px] bg-neutral-900/80 px-1 py-0.5 rounded text-white font-mono pointer-events-none">
          {series.modality || modality}
        </span>
      </div>

      {/* Series Details */}
      <div className="flex flex-col pr-1 min-w-[100px] max-w-[145px]">
        {/* Title and Orientation Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              'px-1 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 border',
              badgeConfig.badgeClassName
            )}
            title={`Orientation: ${badgeConfig.type}`}
          >
            {badgeConfig.label}
          </span>
          <span
            className={cn(
              'font-label text-[11px] font-bold leading-tight truncate flex-1',
              isSelected ? 'text-primary' : 'text-on-surface'
            )}
          >
            {series.seriesDescription || `#${sNum}`}
          </span>
        </div>

        {/* Slice count / Real-time Progress & Thickness */}
        <div className="flex items-center gap-1.5 mt-1">
          {progress.loaded > 0 ? (
            <span
              className={cn(
                'px-1 py-0.5 rounded font-mono text-[9px] font-bold flex items-center gap-0.5',
                progress.isComplete
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-primary/15 text-primary border border-primary/30 animate-pulse'
              )}
            >
              {progress.isComplete && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              {progress.loaded}/{progress.total}
            </span>
          ) : localCaseId ? (
            <span className="px-1 py-0.5 rounded font-mono text-[9px] font-bold bg-surface-container-high text-secondary">
              0/{progress.total}
            </span>
          ) : (
            <span
              className={cn(
                'px-1 py-0.5 rounded font-mono text-[9px] font-bold',
                isSelected
                  ? 'bg-primary/15 text-primary'
                  : 'bg-surface-container-high text-secondary'
              )}
            >
              {series.sliceCount ?? 0} imgs
            </span>
          )}

          {series.sliceThickness && (
            <span className="font-mono text-[9px] text-secondary truncate">
              {series.sliceThickness}
            </span>
          )}
        </div>
      </div>

      {/* Thin Progress Track along bottom of thumbnail card */}
      <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-outline-variant/30 overflow-hidden pointer-events-none">
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
  );
});

export function StitchFilmstrip({
  seriesList,
  activeSeriesIndex,
  onSelectSeries,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  invert = false,
}: StitchFilmstripProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  if (!seriesList || seriesList.length === 0) return null;

  // Convert vertical mouse wheel on desktop into horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollBy = (offset: number) => {
    scrollContainerRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="relative z-10 min-h-[78px] h-[78px] px-2 sm:px-3 bg-surface-container-low flex items-center justify-between gap-2 sm:gap-3 border-b border-outline-variant/50 select-none overflow-hidden shrink-0">
      {/* Scrollable Series Rail with Visible Desktop Scrollbar & Wheel Support */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className={cn(
          'flex items-center gap-2 py-1 pb-2 min-w-0 flex-1 overflow-x-auto overflow-y-hidden touch-pan-x',
          // Desktop custom scrollbar styling
          'scrollbar-thin scrollbar-thumb-outline-variant/60 hover:scrollbar-thumb-primary/70 scrollbar-track-transparent',
          '[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-surface-container/30 [&::-webkit-scrollbar-track]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-outline-variant/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-primary/70'
        )}
      >
        <div className="flex items-center gap-2 shrink-0">
          {seriesList.map((s, idx) => (
            <StitchFilmstripItem
              key={`filmstrip-series-${(s as any).seriesInstanceUid || s.seriesNumber || 'series'}-${idx}`}
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

      {/* Universal Quick Series Paging & Scroll Steppers (Desktop & Mobile) */}
      {seriesList.length > 1 && (
        <div className="flex items-center gap-1 shrink-0 pl-1.5 border-l border-outline-variant/40">
          <button
            type="button"
            onClick={() => scrollBy(-220)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-surface-container text-secondary hover:text-primary hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer touch-manipulation"
            title="Scroll Sequences Left (or roll mouse wheel)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-[10px] text-secondary font-bold px-1 whitespace-nowrap">
            {activeSeriesIndex + 1}/{seriesList.length}
          </span>
          <button
            type="button"
            onClick={() => scrollBy(220)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-surface-container text-secondary hover:text-primary hover:bg-surface-container-high active:scale-95 transition-all cursor-pointer touch-manipulation"
            title="Scroll Sequences Right (or roll mouse wheel)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
