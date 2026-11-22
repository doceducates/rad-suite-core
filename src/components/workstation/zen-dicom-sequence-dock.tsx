'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layers, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { getPlaneBadge } from './zen-dicom-toolbar-definitions';
import { cn } from '@/lib/utils';

export interface DockSeriesItem {
  seriesInstanceUid?: string;
  seriesDescription?: string;
  orientation?: string;
  sliceCount?: number;
  instances?: any[];
  slices?: any[];
  [key: string]: any;
}

export interface ZenDicomSequenceDockProps {
  seriesList: DockSeriesItem[];
  activeSeriesIndex: number;
  onSelectSeries: (idx: number) => void;
  isRailCollapsed?: boolean;
}

export function ZenDicomSequenceDock({
  seriesList,
  activeSeriesIndex,
  onSelectSeries,
  isRailCollapsed = false,
}: ZenDicomSequenceDockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  if (!seriesList || seriesList.length <= 1) return null;

  const currentSeries = seriesList[activeSeriesIndex] || seriesList[0];
  const activeDesc = currentSeries?.seriesDescription || `Series #${activeSeriesIndex + 1}`;
  const activeBadge = getPlaneBadge(activeDesc, currentSeries?.orientation);

  return (
    <div
      ref={dockRef}
      onWheel={(e) => e.stopPropagation()}
      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 select-none transition-all duration-200"
    >
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 rounded-xl border border-outline-variant/80 bg-surface-container-high/90 hover:bg-surface-container-highest px-2 py-1.5 shadow-2xl backdrop-blur-md transition-all cursor-pointer group"
          title={`Expand Sequence Explorer (${seriesList.length} sequences available)`}
          aria-label="Expand Sequence Explorer"
        >
          <Layers className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
          <span
            className={cn(
              'flex h-4 px-1 items-center justify-center rounded border text-[9px] font-bold font-mono',
              activeBadge.color
            )}
          >
            {activeBadge.tag}
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      ) : (
        <div className="flex flex-col gap-1 rounded-2xl border border-outline-variant/80 bg-surface-container-high/95 p-2 shadow-2xl backdrop-blur-md max-w-[240px] sm:max-w-[260px] animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-outline-variant/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              <Layers className="w-3 h-3 text-primary" />
              <span>Sequences ({seriesList.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Collapse sequence dock"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Series Options List */}
          <div className="flex flex-col gap-1 py-1 max-h-[50vh] overflow-y-auto no-scrollbar">
            {seriesList.map((series, idx) => {
              const isActive = idx === activeSeriesIndex;
              const desc = series?.seriesDescription || `Series #${idx + 1}`;
              const badge = getPlaneBadge(desc, series?.orientation);
              const sliceCount =
                series?.sliceCount ||
                (series as DockSeriesItem)?.instances?.length ||
                series?.slices?.length ||
                1;

              return (
                <button
                  key={series?.seriesInstanceUid || idx}
                  type="button"
                  onClick={() => {
                    onSelectSeries(idx);
                    setIsExpanded(false);
                  }}
                  className={cn(
                    'flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl border text-left transition-all cursor-pointer group',
                    isActive
                      ? 'bg-primary/15 border-primary/60 text-foreground shadow-xs font-semibold'
                      : 'bg-surface-container hover:bg-surface-container-highest border-outline-variant/40 text-muted-foreground hover:text-foreground'
                  )}
                  title={`${desc} (${sliceCount} slices)`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'flex h-4.5 px-1.5 items-center justify-center rounded border text-[9px] font-bold font-mono shrink-0',
                        badge.color
                      )}
                    >
                      {badge.tag}
                    </span>
                    <span className="text-[11px] truncate">{desc}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-muted-foreground">
                    <span>{sliceCount}s</span>
                    {isActive && <Check className="w-3 h-3 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
