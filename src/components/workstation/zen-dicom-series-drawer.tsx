'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { getPlaneBadge } from './zen-dicom-toolbar-definitions';
import { ZenSeriesThumbnail } from './zen-series-thumbnail';
import { cn } from '@/lib/utils';

export interface SeriesDrawerItem {
  seriesInstanceUid?: string;
  seriesNumber?: string;
  seriesDescription?: string;
  orientation?: string;
  sliceCount?: number;
  studyDate?: string;
  seriesDate?: string;
  instances?: any[];
  slices?: any[];
  [key: string]: any;
}

export interface ZenDicomSeriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  seriesList: SeriesDrawerItem[];
  activeSeriesIndex: number;
  onSelectSeries: (idx: number) => void;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  isDocked?: boolean;
}

function formatStudyDate(raw?: string): string {
  if (!raw) {
    const now = new Date();
    return `${now.toLocaleString('en-US', { month: 'short' })} ${now.getDate()}`;
  }
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = parseInt(raw.slice(4, 6), 10) - 1;
    const d = parseInt(raw.slice(6, 8), 10);
    const dt = new Date(Number(y), m, d);
    return `${dt.toLocaleString('en-US', { month: 'short' })} ${d}`;
  }
  return raw;
}

export function ZenDicomSeriesDrawer({
  isOpen,
  onClose,
  seriesList = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  modality = 'MR',
  isLocalCase = false,
  localCaseId,
  isDocked = true,
}: ZenDicomSeriesDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside drawer ONLY in floating/overlay mode
  useEffect(() => {
    if (!isOpen || isDocked) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, isDocked, onClose]);

  const studyDateLabel = useMemo(() => {
    const first = seriesList[0];
    return formatStudyDate(first?.studyDate || first?.seriesDate);
  }, [seriesList]);

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      onWheel={(e) => e.stopPropagation()}
      className={cn(
        'flex flex-col font-sans select-none transition-all duration-150',
        isDocked
          ? 'w-16 sm:w-20 h-full border-r border-outline-variant/60 shrink-0 bg-surface-container/95 relative z-20'
          : 'absolute left-0 top-0 bottom-0 z-30 w-20 max-w-[85%] bg-surface-container/95 backdrop-blur-md border-r border-outline-variant/70 shadow-2xl animate-in slide-in-from-left duration-200'
      )}
    >
      {/* Vitrea MMV Rail Header: Stacked Date + Modality Badge + Collapse Toggle */}
      <div className="h-9 px-1 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-high/70 shrink-0">
        <div className="flex flex-col items-center justify-center min-w-0 flex-1 leading-none">
          <span className="font-semibold text-[9px] text-foreground tracking-tight truncate max-w-full">
            {studyDateLabel}
          </span>
          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-primary text-primary-foreground leading-none mt-0.5 shadow-2xs">
            {modality}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-surface-container-highest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Hide Series Rail (Click Series in header to re-open)"
          aria-label="Hide Series Rail"
        >
          {isDocked ? <ChevronLeft className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Series Cards Vertically Stacked Scroll List */}
      <div
        onWheel={(e) => e.stopPropagation()}
        className="flex-1 overflow-y-auto no-scrollbar p-1 flex flex-col gap-1.5"
      >
        {seriesList.length === 0 ? (
          <div className="py-8 text-center text-[10px] text-muted-foreground">
            No series
          </div>
        ) : (
          seriesList.map((series, idx) => {
            const isActive = idx === activeSeriesIndex;
            const desc = series?.seriesDescription || `Series #${idx + 1}`;
            const badge = getPlaneBadge(desc, series?.orientation);
            const seriesNo = series?.seriesNumber || `${(idx + 1) * 1000 + 1}`;
            const sliceCount =
              series?.sliceCount ||
              series?.instances?.length ||
              series?.slices?.length ||
              1;

            return (
              <div
                key={series?.seriesInstanceUid || idx}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/rad-series-index', String(idx));
                  e.dataTransfer.setData('text/plain', String(idx));
                  e.dataTransfer.effectAllowed = 'copy';
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.opacity = '0.5';
                  }
                }}
                onDragEnd={(e) => {
                  if (e.currentTarget instanceof HTMLElement) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
                onClick={() => {
                  onSelectSeries(idx);
                  if (!isDocked) onClose();
                }}
                className={cn(
                  'w-full text-center p-1 rounded-xl transition-all border flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing group select-none shadow-2xs',
                  isActive
                    ? 'bg-primary/20 border-primary text-foreground shadow-xs ring-1 ring-primary/60'
                    : 'bg-surface-container-low/80 hover:bg-surface-container-high border-outline-variant/40 text-foreground hover:border-outline-variant'
                )}
                title={`${seriesNo} — ${desc} (${sliceCount} slices). Drag to any pane or click to view.`}
              >
                {/* Real DICOM Thumbnail with Corner Plane Badge */}
                <div
                  className={cn(
                    'relative w-12 h-12 rounded-lg overflow-hidden bg-black border shrink-0 shadow-xs flex items-center justify-center transition-all',
                    isActive ? 'border-primary ring-1 ring-primary/60' : 'border-outline-variant/60'
                  )}
                >
                  <ZenSeriesThumbnail
                    series={series as any}
                    index={idx}
                    modality={modality}
                    isLocalCase={isLocalCase}
                    localCaseId={localCaseId}
                    width={48}
                    height={48}
                  />
                  <span
                    className={cn(
                      'absolute bottom-0.5 right-0.5 px-0.8 py-0.2 rounded font-mono font-bold text-[7px] border uppercase leading-none shadow-xs backdrop-blur-xs',
                      badge.color
                    )}
                  >
                    {badge.tag}
                  </span>
                </div>

                {/* Vertically Stacked Metadata */}
                <div className="w-full flex flex-col items-center text-center overflow-hidden">
                  <div className="flex items-center justify-center gap-1 w-full font-mono text-[9px] text-muted-foreground font-bold">
                    <span className="truncate">#{seriesNo}</span>
                    <span className="px-1 py-0.1 rounded-full text-[8px] font-bold bg-surface-container-highest/90 text-foreground border border-outline-variant/50">
                      {sliceCount}
                    </span>
                  </div>
                  <div className="font-semibold text-[9.5px] truncate w-full leading-tight group-hover:text-primary transition-colors mt-0.5">
                    {desc}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Vitrea MMV Footer */}
      <div className="h-6 px-1 border-t border-outline-variant/60 flex items-center justify-center text-[9px] font-mono text-muted-foreground/80 bg-surface-container-high/40 shrink-0">
        <span>{seriesList.length} ser</span>
      </div>
    </div>
  );
}
