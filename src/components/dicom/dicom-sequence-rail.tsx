'use client';

import React from 'react';
import type { DicomSeries } from '@/services/dicom.service';
import { cn } from '@/lib/utils';
import { Layers } from 'lucide-react';

interface DicomSequenceRailProps {
  series: DicomSeries[];
  activeIndex: number;
  onSelectSeries: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function DicomSequenceRail({
  series,
  activeIndex,
  onSelectSeries,
  orientation = 'horizontal',
}: DicomSequenceRailProps) {
  if (!series || series.length <= 1) return null;

  return (
    <div
      className={cn(
        'p-1.5 bg-zinc-950/90 border-zinc-800 flex gap-1.5 overflow-x-auto overflow-y-hidden select-none scrollbar-thin scrollbar-thumb-zinc-700',
        orientation === 'horizontal' ? 'border-b flex-row' : 'border-r flex-col'
      )}
    >
      <div className="flex items-center gap-1.5 px-2 text-zinc-500 text-[10px] font-mono shrink-0 uppercase tracking-wider">
        <Layers className="w-3 h-3 text-primary" />
        <span>Series</span>
      </div>

      {series.map((s, idx) => {
        const isActive = idx === activeIndex;
        const orientLabel = s.orientation === 'AXIAL' ? 'AX' : s.orientation === 'CORONAL' ? 'COR' : 'SAG';

        return (
          <button
            key={s.id || idx}
            type="button"
            onClick={() => onSelectSeries(idx)}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-2 shrink-0 transition-all border cursor-pointer',
              isActive
                ? 'bg-primary/20 text-primary border-primary/50 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
            )}
          >
            <span
              className={cn(
                'px-1 py-0.2 rounded text-[9px] font-mono font-bold',
                s.orientation === 'AXIAL'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : s.orientation === 'CORONAL'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              )}
            >
              {orientLabel}
            </span>
            <span className="truncate max-w-[130px] font-mono text-[11px]">{s.description}</span>
            <span className="text-[10px] text-zinc-500 font-mono">({s.instances.length})</span>
          </button>
        );
      })}
    </div>
  );
}
