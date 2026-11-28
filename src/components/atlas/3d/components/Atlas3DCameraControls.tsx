'use client';

import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Eye,
  Compass,
  Sparkles,
  Layers,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { AtlasNavBus } from '../vitrea/AtlasNavBus';
import { cn } from '@/lib/utils';

interface Atlas3DCameraControlsProps {
  className?: string;
}

export function Atlas3DCameraControls({ className }: Atlas3DCameraControlsProps) {
  const [shadingMode, setShadingMode] = useState<'default' | 'xray' | 'dark'>('default');
  const [activeOrientation, setActiveOrientation] = useState<string>('anterior');

  const handleOrientation = (view: 'anterior' | 'posterior' | 'left' | 'right' | 'superior' | 'inferior') => {
    setActiveOrientation(view);
    AtlasNavBus.emitCameraCommand({ type: 'orientation', view });
  };

  const handleZoom = (factor: number) => {
    AtlasNavBus.emitCameraCommand({ type: 'zoom', factor });
  };

  const handleReset = () => {
    setActiveOrientation('anterior');
    AtlasNavBus.emitCameraCommand({ type: 'reset' });
  };

  const toggleShading = () => {
    const nextMode = shadingMode === 'default' ? 'dark' : shadingMode === 'dark' ? 'xray' : 'default';
    setShadingMode(nextMode);
    AtlasNavBus.emitCameraCommand({ type: 'shading', mode: nextMode });
  };

  return (
    <div className={cn('flex flex-col gap-1.5 select-none', className)}>
      {/* Anatomical Views Cluster */}
      <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1">
        <span className="text-[9px] font-mono font-semibold tracking-wider uppercase text-emerald-400/90 text-center px-1 py-0.5">
          View
        </span>
        <div className="grid grid-cols-2 gap-1 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => handleOrientation('anterior')}
            className={cn(
              'px-2 py-1 rounded-md transition cursor-pointer text-center',
              activeOrientation === 'anterior'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            )}
            title="Anterior (Frontal) View"
          >
            Ant
          </button>
          <button
            type="button"
            onClick={() => handleOrientation('posterior')}
            className={cn(
              'px-2 py-1 rounded-md transition cursor-pointer text-center',
              activeOrientation === 'posterior'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            )}
            title="Posterior (Dorsal) View"
          >
            Post
          </button>
          <button
            type="button"
            onClick={() => handleOrientation('left')}
            className={cn(
              'px-2 py-1 rounded-md transition cursor-pointer text-center',
              activeOrientation === 'left'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            )}
            title="Left Lateral View"
          >
            Lat L
          </button>
          <button
            type="button"
            onClick={() => handleOrientation('right')}
            className={cn(
              'px-2 py-1 rounded-md transition cursor-pointer text-center',
              activeOrientation === 'right'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            )}
            title="Right Lateral View"
          >
            Lat R
          </button>
        </div>
        <button
          type="button"
          onClick={() => handleOrientation('superior')}
          className={cn(
            'w-full py-1 text-[10px] rounded-md transition cursor-pointer text-center font-medium',
            activeOrientation === 'superior'
              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          )}
          title="Superior (Cranial) View"
        >
          Cranial (Top)
        </button>
      </div>

      {/* Camera Action Utilities */}
      <div className="bg-slate-950/85 backdrop-blur-xl border border-emerald-500/25 rounded-xl p-1 shadow-2xl flex flex-col gap-1 items-center">
        <button
          type="button"
          onClick={() => handleZoom(0.85)}
          className="p-2 text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded-lg transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => handleZoom(1.15)}
          className="p-2 text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded-lg transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-5 h-px bg-slate-800 my-0.5" />

        <button
          type="button"
          onClick={handleReset}
          className="p-2 text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded-lg transition cursor-pointer"
          title="Reset Camera / Center Body"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleShading}
          className={cn(
            'p-2 rounded-lg transition cursor-pointer',
            shadingMode !== 'default'
              ? 'text-emerald-400 bg-emerald-500/15'
              : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
          )}
          title={`Lighting: ${shadingMode}`}
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
