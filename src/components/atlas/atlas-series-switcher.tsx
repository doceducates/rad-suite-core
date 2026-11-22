'use client';

import React from 'react';
import type { AnatomySeries } from '@/types';

interface AtlasSeriesSwitcherProps {
  seriesList: AnatomySeries[];
  activeSeriesId: number;
  onSelectSeries: (seriesId: number) => void;
}

function getPlaneIndicator(title: string) {
  const t = (title || '').toLowerCase();
  if (t.includes('axial')) return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]';
  if (t.includes('coronal')) return 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]';
  if (t.includes('sagittal')) return 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]';
  if (t.includes('3d')) return 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.6)]';
  return 'bg-primary shadow-[0_0_6px_rgba(59,130,246,0.6)]';
}

export function AtlasSeriesSwitcher({
  seriesList,
  activeSeriesId,
  onSelectSeries,
}: AtlasSeriesSwitcherProps) {
  if (!seriesList || seriesList.length <= 1) return null;

  return (
    <div
      className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-1 max-w-[42%] sm:max-w-[36%] md:max-w-[32%] lg:max-w-[30%] overflow-x-auto no-scrollbar rounded-xl border border-white/15 bg-black/80 p-1 shadow-2xl backdrop-blur-md touch-pan-x"
      title="Switch anatomical series / projection"
    >
      {seriesList.map((s) => {
        const isActive = s.id === activeSeriesId;
        const planeTitle = s.title || `Series ${s.sort_order}`;
        const dotColor = getPlaneIndicator(planeTitle);

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelectSeries(s.id)}
            title={planeTitle}
            className={`flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
            <span className="truncate max-w-[120px]">{planeTitle}</span>
          </button>
        );
      })}
    </div>
  );
}
