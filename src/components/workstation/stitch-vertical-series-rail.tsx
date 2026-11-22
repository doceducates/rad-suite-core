'use client';

import React, { useState } from 'react';
import { ZenSeriesThumbnail } from './zen-series-thumbnail';
import { useSeriesProgress, resolveOrientationBadge } from '@/hooks/use-series-progress';
import { Check, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StitchSeriesItem } from './stitch-filmstrip';

interface StitchVerticalSeriesRailProps {
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  onSelectSeries: (index: number) => void;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  invert?: boolean;
  defaultCollapsed?: boolean;
}

export function StitchVerticalSeriesRail({
  seriesList,
  activeSeriesIndex,
  onSelectSeries,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  invert = false,
  defaultCollapsed = false,
}: StitchVerticalSeriesRailProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (!seriesList || seriesList.length === 0) return null;

  return (
    <div
      className={cn(
        'h-full flex flex-col bg-surface-container/95 border-r border-outline-variant/40 select-none shrink-0 transition-all duration-200 z-30',
        isCollapsed ? 'w-12' : 'w-40 sm:w-44'
      )}
    >
      {/* Top Header: Collapse Toggle & Series Count */}
      <div className="h-8 px-2 flex items-center justify-between border-b border-outline-variant/30 text-secondary text-[11px] font-semibold shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 truncate">
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">Series ({seriesList.length})</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          className={cn(
            'p-1 rounded-md hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors cursor-pointer',
            isCollapsed && 'mx-auto'
          )}
          title={isCollapsed ? 'Expand Series Rail (Watson Workstation Style)' : 'Collapse Series Rail'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Vertical Scrollable Series List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1.5 [scrollbar-width:thin]">
        {seriesList.map((series, index) => {
          const isSelected = index === activeSeriesIndex;
          const sNum = series.seriesNumber || String(index + 1);
          const total = series.sliceCount ?? 0;
          return (
            <VerticalSeriesRailItem
              key={`vertical-rail-${(series as any).seriesInstanceUid || sNum}-${index}`}
              series={series}
              index={index}
              isSelected={isSelected}
              isCollapsed={isCollapsed}
              onSelect={onSelectSeries}
              modality={modality}
              isLocalCase={isLocalCase}
              localCaseId={localCaseId}
              invert={invert}
              totalSlices={total}
            />
          );
        })}
      </div>
    </div>
  );
}

interface VerticalSeriesRailItemProps {
  series: StitchSeriesItem;
  index: number;
  isSelected: boolean;
  isCollapsed: boolean;
  onSelect: (index: number) => void;
  modality: string;
  isLocalCase: boolean;
  localCaseId?: string;
  invert: boolean;
  totalSlices: number;
}

const VerticalSeriesRailItem = React.memo(function VerticalSeriesRailItem({
  series,
  index,
  isSelected,
  isCollapsed,
  onSelect,
  modality,
  isLocalCase,
  localCaseId,
  invert,
  totalSlices,
}: VerticalSeriesRailItemProps) {
  const sNum = series.seriesNumber || String(index + 1);
  const progress = useSeriesProgress(localCaseId, sNum, totalSlices);
  const badgeConfig = resolveOrientationBadge(series.orientation, series.seriesDescription);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setData('application/rad-series-index', String(index));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isCollapsed) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        draggable={true}
        onDragStart={handleDragStart}
        onClick={() => onSelect(index)}
        className={cn(
          'w-9 h-11 mx-auto rounded-lg flex flex-col items-center justify-center p-1 transition-all cursor-pointer relative border group',
          isSelected
            ? 'bg-surface-container-lowest border-primary ring-1 ring-primary shadow-xs'
            : 'bg-surface-container border-outline-variant/40 hover:border-outline'
        )}
        title={`Series #${sNum}: ${series.seriesDescription || 'Series'} (${progress.loaded}/${progress.total} imgs)`}
      >
        <span
          className={cn(
            'px-0.5 rounded text-[7px] font-mono font-bold uppercase border leading-none',
            badgeConfig.badgeClassName
          )}
        >
          {badgeConfig.label}
        </span>
        <span className="text-[10px] font-bold font-mono mt-0.5">#{sNum}</span>
        {progress.loaded > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-outline-variant/30 overflow-hidden rounded-b-lg">
            <div
              className={cn('h-full', progress.isComplete ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${Math.max(progress.percent, 10)}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      draggable={true}
      onDragStart={handleDragStart}
      onClick={() => onSelect(index)}
      className={cn(
        'group relative flex flex-col p-1.5 rounded-xl select-none transition-all border overflow-hidden cursor-pointer md:cursor-grab md:active:cursor-grabbing',
        isSelected
          ? 'bg-surface-container-lowest border-primary/70 ring-1 ring-primary/40 shadow-xs'
          : 'bg-surface-container border-outline-variant/50 hover:border-outline'
      )}
      title={`Series #${sNum}: ${series.seriesDescription || 'Series'} • Click to view · Drag & drop to pane`}
    >
      <div className="flex items-center gap-2">
        {/* Thumbnail Preview */}
        <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-primary-fixed-dim relative border border-outline-variant/40 overflow-hidden shrink-0">
          <ZenSeriesThumbnail
            series={series}
            index={index}
            modality={series.modality || modality}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            width={40}
            height={40}
            invert={invert}
          />
          <span className="absolute top-0.5 right-0.5 text-[7px] bg-neutral-900/80 px-0.5 py-0.2 rounded text-white font-mono pointer-events-none">
            {series.modality || modality}
          </span>
        </div>

        {/* Series Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={cn(
                'px-1 py-0.2 rounded text-[7px] font-mono font-bold uppercase shrink-0 border leading-none',
                badgeConfig.badgeClassName
              )}
            >
              {badgeConfig.label}
            </span>
            <span
              className={cn(
                'font-label text-[10px] font-bold leading-tight truncate flex-1',
                isSelected ? 'text-primary' : 'text-on-surface'
              )}
            >
              {series.seriesDescription || `#${sNum}`}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-1 font-mono text-[9px] text-secondary">
            {progress.loaded > 0 ? (
              <span
                className={cn(
                  'px-1 py-0.2 rounded text-[8px] font-bold flex items-center gap-0.5',
                  progress.isComplete
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/15 text-primary'
                )}
              >
                {progress.isComplete && <Check className="w-2 h-2 stroke-[3]" />}
                {progress.loaded}/{progress.total}
              </span>
            ) : (
              <span>{series.sliceCount ?? 0} imgs</span>
            )}
            {series.sliceThickness && <span className="truncate">{series.sliceThickness}</span>}
          </div>
        </div>
      </div>

      {/* Progress Track along bottom */}
      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-outline-variant/30 overflow-hidden pointer-events-none">
        <div
          className={cn('h-full transition-all duration-300', progress.isComplete ? 'bg-emerald-500' : 'bg-primary')}
          style={{ width: `${progress.loaded > 0 ? Math.max(progress.percent, 4) : 0}%` }}
        />
      </div>
    </div>
  );
});
