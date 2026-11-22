'use client';

import React from 'react';
import {
  SunMoon,
  Hand,
  ZoomIn,
  Ruler,
  RotateCw,
  Contrast,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DicomTool } from './landing-real-dicom-viewer';

interface LandingRealDicomToolbarProps {
  tool: DicomTool;
  setTool: (tool: DicomTool) => void;
  setWw: (ww: number) => void;
  setWc: (wc: number) => void;
  cine: boolean;
  setCine: (cine: boolean | ((prev: boolean) => boolean)) => void;
  invert: boolean;
  setInvert: (inv: boolean | ((prev: boolean) => boolean)) => void;
  setRotate: (rot: number | ((prev: number) => number)) => void;
  onReset: () => void;
}

export function LandingRealDicomToolbar({
  tool,
  setTool,
  setWw,
  setWc,
  cine,
  setCine,
  invert,
  setInvert,
  setRotate,
  onReset,
}: LandingRealDicomToolbarProps) {
  const tools = [
    { id: 'wl', label: 'W/L', icon: SunMoon },
    { id: 'pan', label: 'Pan', icon: Hand },
    { id: 'zoom', label: 'Zoom', icon: ZoomIn },
    { id: 'length', label: 'Caliper', icon: Ruler },
  ] as const;

  return (
    <div className="px-3 py-2 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
      {/* Left Tools */}
      <div className="flex items-center gap-1">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id as DicomTool)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-mono transition-colors cursor-pointer',
                active
                  ? 'bg-primary/20 text-primary font-semibold border border-primary/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}

        <div className="h-4 w-px bg-zinc-800 mx-1.5 hidden sm:block" />

        {/* Quick Presets */}
        <button
          type="button"
          onClick={() => { setWw(415); setWc(207); }}
          className="px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-primary cursor-pointer hidden md:inline-block"
          title="Standard T1 Brain Window"
        >
          T1 Std
        </button>
        <button
          type="button"
          onClick={() => { setWw(680); setWc(320); }}
          className="px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-primary cursor-pointer hidden md:inline-block"
          title="Lesion High Contrast"
        >
          Lesion CE
        </button>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCine((prev) => !prev)}
          className={cn(
            'px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[11px] font-mono transition-colors cursor-pointer',
            cine ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
          title="Cine Playback (14 FPS)"
        >
          {cine ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{cine ? 'Stop' : 'Cine'}</span>
        </button>

        <button
          type="button"
          onClick={() => setInvert((inv) => !inv)}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 cursor-pointer"
          title="Invert Grayscale"
        >
          <Contrast className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setRotate((r) => (r + 90) % 360)}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 cursor-pointer"
          title="Rotate 90°"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 cursor-pointer"
          title="Reset Viewport"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
