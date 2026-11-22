'use client';

// Layer 4: Vertical Sequence / Plane Explorer Dock (<150 lines)
import React, { useState, useEffect, useRef } from 'react';
import { Layers, ChevronRight, ChevronLeft } from 'lucide-react';
import type { AnatomySeries } from '@/types';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface AtlasSequenceDockProps {
  seriesList: AnatomySeries[];
  activeSeriesId: number;
  onSelectSeries: (seriesId: number) => void;
}

function getSeriesBadge(title: string) {
  const t = (title || '').toLowerCase();
  if (t.includes('axial')) {
    return { tag: 'AX', color: 'text-red-400 border-red-500/40 bg-red-500/10' };
  }
  if (t.includes('coronal')) {
    return { tag: 'COR', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' };
  }
  if (t.includes('sagittal')) {
    return { tag: 'SAG', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' };
  }
  if (t.includes('3d') || t.includes('volume')) {
    return { tag: '3D', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' };
  }
  return { tag: 'PL', color: 'text-primary border-primary/40 bg-primary/10' };
}

export function AtlasSequenceDock({
  seriesList,
  activeSeriesId,
  onSelectSeries,
}: AtlasSequenceDockProps) {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // Automatically minimize on mobile screens so viewport focus remains on scrolling
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  // Click outside to drop focus and (on mobile) collapse
  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (dockRef.current && !dockRef.current.contains(target)) {
        setIsFocused(false);
        if (isMobile) {
          setIsCollapsed(true);
        }
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isMobile]);

  if (!seriesList || seriesList.length <= 1) return null;

  const activeSeries = seriesList.find((s) => s.id === activeSeriesId) || seriesList[0];
  const activeBadge = getSeriesBadge(activeSeries?.title || '');
  const isNormallyVisible = isFocused || isHovered || (!isCollapsed && isMobile);

  return (
    <div
      ref={dockRef}
      data-scrollable="true"
      onPointerDown={() => setIsFocused(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={(e) => e.stopPropagation()}
      className={`absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 transition-all duration-200 select-none ${
        isNormallyVisible
          ? 'opacity-100'
          : 'opacity-40 sm:opacity-50 hover:opacity-100 focus-within:opacity-100'
      }`}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(false);
            setIsFocused(true);
          }}
          className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 shadow-2xl backdrop-blur-md transition-all cursor-pointer ${
            isNormallyVisible
              ? 'border-white/25 bg-black/90 text-white'
              : 'border-white/10 bg-black/50 text-white/70 hover:bg-black/90 hover:text-white hover:border-white/20'
          }`}
          title={`Expand Sequence Explorer (${seriesList.length} sequences available)`}
        >
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span
            className={`flex h-4 px-1 items-center justify-center rounded border text-[9px] font-bold font-mono ${activeBadge.color}`}
          >
            {activeBadge.tag}
          </span>
          <ChevronRight className="h-3 w-3 opacity-60" />
        </button>
      ) : (
        <div
          className={`flex flex-col gap-1 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-md transition-all max-w-[210px] sm:max-w-[220px] ${
            isNormallyVisible
              ? 'border-white/25 bg-black/90'
              : 'border-white/10 bg-black/55 hover:bg-black/90'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/60">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-primary" />
              <span>Sequences ({seriesList.length})</span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(true);
              }}
              className="p-0.5 rounded text-white/40 hover:text-white cursor-pointer"
              title="Collapse dock to minimize viewport obstruction"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Sequence List */}
          <div className="flex flex-col gap-1 py-1 max-h-[48vh] overflow-y-auto no-scrollbar">
            {seriesList.map((s) => {
              const isActive = s.id === activeSeriesId;
              const planeTitle = s.title || `Series ${s.sort_order}`;
              const badge = getSeriesBadge(planeTitle);
              const sliceCount = s.slice_count || s.slices?.length || 0;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSeries(s.id);
                    if (isMobile) {
                      setIsCollapsed(true);
                    }
                  }}
                  className={`group flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-primary/60 bg-primary/20 text-white shadow-xs'
                      : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  title={`${planeTitle} — ${sliceCount} slices`}
                >
                  <span
                    className={`flex h-5 w-7 shrink-0 items-center justify-center rounded border text-[9px] font-bold font-mono ${badge.color}`}
                  >
                    {badge.tag}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs leading-tight truncate ${
                        isActive ? 'font-bold text-white' : 'font-medium'
                      }`}
                    >
                      {planeTitle}
                    </div>
                    {sliceCount > 0 && (
                      <div className="text-[10px] text-white/50 leading-tight mt-0.5">
                        {sliceCount} slices
                      </div>
                    )}
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
