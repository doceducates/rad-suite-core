'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

export interface ZenDicomScrubberProps {
  seriesNumber?: number | string;
  slice: number;
  maxSlices: number;
  pixelSpacing?: number;
  onSliceChange: (sl: number) => void;
  startSmoothScroll?: (delta: number) => void;
  stopSmoothScroll?: () => void;
  isCinePlaying?: boolean;
  onToggleCine?: () => void;
  caseId?: string;
  orientation?: string;
  floating?: boolean;
}

export function ZenDicomScrubber({
  slice,
  maxSlices,
  onSliceChange,
  startSmoothScroll,
  stopSmoothScroll,
  isCinePlaying = false,
  onToggleCine,
  floating = true,
}: ZenDicomScrubberProps) {
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);

  const handlePrevDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (startSmoothScroll) startSmoothScroll(-1);
  };

  const handleNextDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (startSmoothScroll) startSmoothScroll(1);
  };

  const handlePointerStop = (e: React.PointerEvent) => {
    e.stopPropagation();
    stopSmoothScroll?.();
  };

  if (maxSlices <= 1) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        floating
          ? 'absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-20 w-[84%] max-w-[280px] sm:max-w-xs md:max-w-sm px-2.5 py-1 bg-zinc-950/85 dark:bg-black/90 backdrop-blur-md rounded-full border border-white/10 shadow-xl transition-all duration-200 pointer-events-auto select-none'
          : 'h-7 px-3 bg-surface-container/95 flex items-center justify-between border-t border-outline-variant/30 shrink-0 select-none',
        isDragging
          ? 'opacity-100 scale-[1.02]'
          : isMobile
          ? 'opacity-90 shadow-md'
          : 'opacity-30 group-hover:opacity-85 hover:!opacity-100 active:!opacity-100 focus-within:opacity-100'
      )}
    >
      {/* Floating slice tooltip bubble during active scrubbing */}
      {isDragging && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-zinc-900/95 border border-primary/40 text-primary font-mono text-[10px] font-bold shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
          Slice {slice + 1} of {maxSlices}
        </div>
      )}

      <div className="flex-1 flex items-center gap-2 select-none">
        {onToggleCine && (
          <button
            type="button"
            onClick={onToggleCine}
            className={cn(
              'w-5 h-5 flex items-center justify-center rounded-full transition-colors cursor-pointer shrink-0',
              isCinePlaying
                ? 'bg-primary text-white shadow-2xs'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            )}
            title={isCinePlaying ? 'Pause Cine Loop (C)' : 'Play Cine Loop (C)'}
          >
            <span className="material-symbols-outlined text-[13px]">
              {isCinePlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onSliceChange(Math.max(0, slice - 1))}
          onPointerDown={handlePrevDown}
          onPointerUp={handlePointerStop}
          onPointerLeave={handlePointerStop}
          onPointerCancel={handlePointerStop}
          disabled={slice <= 0}
          className="w-5 h-5 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer shrink-0"
          title="Previous Slice (↑ / ←)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="font-mono text-[10px] text-zinc-400 font-semibold shrink-0">1</span>

        <input
          type="range"
          role="slider"
          aria-label="DICOM slice scrubber"
          aria-valuenow={slice + 1}
          aria-valuemin={1}
          aria-valuemax={Math.max(1, maxSlices)}
          min={0}
          max={Math.max(0, maxSlices - 1)}
          value={slice}
          onChange={(e) => onSliceChange(Number(e.target.value))}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="flex-1 accent-primary cursor-pointer h-1.5 bg-white/20 rounded-full"
        />

        <span className="font-mono text-[10px] text-zinc-400 font-semibold shrink-0">{maxSlices}</span>

        <button
          type="button"
          onClick={() => onSliceChange(Math.min(maxSlices - 1, slice + 1))}
          onPointerDown={handleNextDown}
          onPointerUp={handlePointerStop}
          onPointerLeave={handlePointerStop}
          onPointerCancel={handlePointerStop}
          disabled={slice >= maxSlices - 1}
          className="w-5 h-5 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors cursor-pointer shrink-0"
          title="Next Slice (↓ / →)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
