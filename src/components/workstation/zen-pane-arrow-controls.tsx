'use client';

import React, { useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZenPaneArrowControlsProps {
  slice: number;
  maxSlices: number;
  startSmoothScroll: (delta: number) => void;
  stopSmoothScroll: () => void;
  visible?: boolean;
  isMobile?: boolean;
  onStepSlice?: (delta: number) => void;
}

export function ZenPaneArrowControls({
  slice,
  maxSlices,
  startSmoothScroll,
  stopSmoothScroll,
  visible = true,
  isMobile = false,
  onStepSlice,
}: ZenPaneArrowControlsProps) {
  const lastTouchY = useRef<number | null>(null);
  const pointerDownHandled = useRef(false);

  if (maxSlices <= 1) return null;

  const handlePrevDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    pointerDownHandled.current = true;
    startSmoothScroll(-1);
  };

  const handleNextDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    pointerDownHandled.current = true;
    startSmoothScroll(1);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    stopSmoothScroll();
  };

  const handleClick = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (pointerDownHandled.current) {
      pointerDownHandled.current = false;
      return;
    }
    if (onStepSlice) onStepSlice(delta);
    else startSmoothScroll(delta);
  };

  // Touch drag scrubbing along the sleek capsule on touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches[0]) {
      lastTouchY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (lastTouchY.current !== null && e.touches[0]) {
      const dy = e.touches[0].clientY - lastTouchY.current;
      if (Math.abs(dy) >= 10) {
        const step = dy > 0 ? 1 : -1;
        if (onStepSlice) onStepSlice(step);
        else startSmoothScroll(step);
        lastTouchY.current = e.touches[0].clientY;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    lastTouchY.current = null;
    stopSmoothScroll();
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 bg-zinc-950/85 dark:bg-zinc-900/85 backdrop-blur-md px-1 py-1.5 rounded-full border border-outline-variant/60 shadow-lg pointer-events-auto select-none transition-opacity duration-200',
        isMobile
          ? 'opacity-80 active:opacity-100 hover:opacity-100'
          : visible
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100'
      )}
    >
      <button
        type="button"
        onClick={(e) => handleClick(e, -1)}
        onPointerDown={handlePrevDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={stopSmoothScroll}
        onPointerCancel={stopSmoothScroll}
        disabled={slice <= 0}
        className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-300 hover:text-primary hover:bg-zinc-800 disabled:opacity-20 transition-colors cursor-pointer touch-manipulation"
        title="Previous Slice (↑ / ←) · Press or hold to scroll"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      <div className="text-[9px] font-mono font-semibold text-zinc-300 px-0.5 select-none pointer-events-none text-center">
        <span>{slice + 1}</span>
        <div className="h-px w-2.5 bg-zinc-700 mx-auto my-0.5" />
        <span className="text-[8px] text-zinc-500">{maxSlices}</span>
      </div>

      <button
        type="button"
        onClick={(e) => handleClick(e, 1)}
        onPointerDown={handleNextDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={stopSmoothScroll}
        onPointerCancel={stopSmoothScroll}
        disabled={slice >= maxSlices - 1}
        className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-300 hover:text-primary hover:bg-zinc-800 disabled:opacity-20 transition-colors cursor-pointer touch-manipulation"
        title="Next Slice (↓ / →) · Press or hold to scroll"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
