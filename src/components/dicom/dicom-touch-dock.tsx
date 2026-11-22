'use client';

import React from 'react';
import type { DicomTool } from './dicom-toolbar';
import type { MobileTouchMode } from '@/types/viewport';
import { ZoomIn, Hand, SunMoon, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DicomTouchDockProps {
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  onPrevSlice: () => void;
  onNextSlice: () => void;
  cine: boolean;
  onToggleCine: () => void;
  onReset: () => void;
  sliceIndex: number;
  maxSlices: number;
  touchMode?: MobileTouchMode;
  onSelectTouchMode?: (mode: MobileTouchMode) => void;
}

export function DicomTouchDock({
  activeTool,
  onSelectTool,
  onPrevSlice,
  onNextSlice,
  cine,
  onToggleCine,
  onReset,
  sliceIndex,
  maxSlices,
  touchMode,
  onSelectTouchMode,
}: DicomTouchDockProps) {
  const currentMode = touchMode ?? (activeTool === 'wl' ? 'wl' : 'scrub');

  return (
    <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800 shadow-2xl text-white select-none max-w-full">
      {/* 1. Mode Switcher Pill (Scrub vs W/L) */}
      {onSelectTouchMode ? (
        <div className="flex items-center bg-zinc-900 rounded-xl p-0.5 border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTouchMode('scrub')}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer',
              currentMode === 'scrub'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-zinc-400 hover:text-white'
            )}
            title="Single-finger vertical drag scrubs slices"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden min-[360px]:inline">Scrub</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTouchMode('wl')}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer',
              currentMode === 'wl'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-zinc-400 hover:text-white'
            )}
            title="Single-finger drag adjusts Window/Level (contrast & brightness)"
          >
            <SunMoon className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden min-[360px]:inline">W/L</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectTool('wl')}
            title="Brightness / Contrast (Window/Level)"
            className={cn(
              'p-2 rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer',
              activeTool === 'wl' ? 'bg-primary text-on-primary font-bold' : 'text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <SunMoon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('zoom')}
            title="Zoom Tool"
            className={cn(
              'p-2 rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer',
              activeTool === 'zoom' ? 'bg-primary text-on-primary font-bold' : 'text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTool('pan')}
            title="Pan Tool"
            className={cn(
              'p-2 rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer',
              activeTool === 'pan' ? 'bg-primary text-on-primary font-bold' : 'text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Micro-Stepper & Slice Counter */}
      <div className="flex items-center gap-1 bg-zinc-900/95 rounded-xl px-2 py-1 border border-zinc-800 shrink-0">
        <button
          type="button"
          onClick={onPrevSlice}
          title="Previous Slice"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-[11px] font-bold text-primary min-w-[50px] text-center select-none">
          {sliceIndex + 1}/{maxSlices}
        </span>
        <button
          type="button"
          onClick={onNextSlice}
          title="Next Slice"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Cine Playback & Reset Viewport */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggleCine}
          title={cine ? 'Pause Cine' : 'Play Cine Loop'}
          className={cn(
            'p-2 rounded-xl text-xs flex items-center justify-center transition-colors cursor-pointer active:scale-95',
            cine ? 'bg-primary text-on-primary font-bold' : 'text-zinc-300 hover:bg-zinc-800'
          )}
        >
          {cine ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onReset}
          title="Reset Viewport (Double-tap also resets)"
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
