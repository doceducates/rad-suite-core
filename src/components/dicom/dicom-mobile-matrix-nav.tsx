'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DicomMobileMatrixNavProps {
  totalPanes: number;
  activePaneIndex: number;
  rows: number;
  cols: number;
  onSelectPane: (idx: number) => void;
  onOpenOverview: () => void;
  className?: string;
}

export function DicomMobileMatrixNav({
  totalPanes,
  activePaneIndex,
  rows,
  cols,
  onSelectPane,
  onOpenOverview,
  className,
}: DicomMobileMatrixNavProps) {
  if (totalPanes <= 1) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPane((activePaneIndex - 1 + totalPanes) % totalPanes);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPane((activePaneIndex + 1) % totalPanes);
  };

  return (
    <div
      className={cn(
        'px-2.5 py-1.5 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl flex items-center justify-between gap-2 text-white shadow-xl select-none',
        className
      )}
    >
      {/* Prev Pane Stepper */}
      <button
        type="button"
        onClick={handlePrev}
        className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-0.5 text-xs font-medium cursor-pointer active:scale-95"
        title="Previous Viewport Pane"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[10px] hidden min-[360px]:inline">Prev</span>
      </button>

      {/* Center: Matrix Dot Grid Visualizer */}
      <div className="flex items-center gap-2">
        <div
          className="grid gap-1 p-1 bg-zinc-900 rounded-md border border-zinc-800"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
          title={`Matrix ${rows}x${cols}`}
        >
          {Array.from({ length: totalPanes }, (_, idx) => {
            const isActive = idx === activePaneIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPane(idx)}
                className={cn(
                  'w-2.5 h-2.5 rounded-xs transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary ring-2 ring-primary/50 scale-125'
                    : 'bg-zinc-700 hover:bg-zinc-500'
                )}
                title={`Jump to Pane ${idx + 1}`}
              />
            );
          })}
        </div>

        <div className="font-mono text-[11px] text-zinc-300">
          <span className="text-primary font-bold">P{activePaneIndex + 1}</span>
          <span className="text-zinc-500"> / {totalPanes}</span>
        </div>
      </div>

      {/* Next Pane & Overview Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleNext}
          className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-0.5 text-xs font-medium cursor-pointer active:scale-95"
          title="Next Viewport Pane"
        >
          <span className="text-[10px] hidden min-[360px]:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenOverview}
          className="p-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
          title="Open Matrix Contact Sheet (All Panes)"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
