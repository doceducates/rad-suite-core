'use client';

// Layer 4: Atlas Segmentation Layer List & Master Toggle (<130 lines)
import React from 'react';
import { Sliders, Eye, EyeOff, Layers } from 'lucide-react';
import type { AnatomyLayerMask } from '@/types';

interface AtlasSegmentationLayerListProps {
  layers: AnatomyLayerMask[];
  activeLayerName: string | null;
  onSelectLayer: (layer: string | null) => void;
  maskOpacity: number;
  onMaskOpacityChange: (opacity: number) => void;
}

const OPACITY_PRESETS = [25, 50, 75, 100];

export function AtlasSegmentationLayerList({
  layers,
  activeLayerName,
  onSelectLayer,
  maskOpacity,
  onMaskOpacityChange,
}: AtlasSegmentationLayerListProps) {
  const isAnyMaskActive = activeLayerName !== null;

  const handleToggleAll = () => {
    if (isAnyMaskActive) {
      onSelectLayer(null);
    } else if (layers.length > 0) {
      onSelectLayer(layers[0].layer);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3 space-y-3 select-none">
      {/* 1. Master Enable / Disable Toggle Button */}
      <button
        type="button"
        onClick={handleToggleAll}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
          isAnyMaskActive
            ? 'border-primary/50 bg-primary/10 text-primary shadow-xs'
            : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60'
        }`}
      >
        <span className="flex items-center gap-2">
          {isAnyMaskActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          <span>{isAnyMaskActive ? 'All Masks Enabled' : 'All Masks Disabled'}</span>
        </span>
        <span className="text-[10px] font-mono uppercase rounded bg-background px-1.5 py-0.5 border border-border/40">
          {isAnyMaskActive ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* 2. Opacity Control & Presets */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Sliders className="h-3.5 w-3.5 text-primary" />
            Mask Opacity
          </span>
          <span className="font-mono text-xs font-semibold text-primary">{maskOpacity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={maskOpacity}
          onChange={(e) => onMaskOpacityChange(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary focus:outline-none"
        />
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {OPACITY_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onMaskOpacityChange(p)}
              className={`flex-1 py-1 rounded text-[10px] font-mono transition cursor-pointer border ${
                maskOpacity === p
                  ? 'bg-primary text-primary-foreground font-semibold border-primary'
                  : 'bg-background/80 text-muted-foreground border-border/40 hover:bg-muted'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* 3. Layer Mask Items */}
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          Available Layers ({layers.length})
        </div>

        <button
          type="button"
          onClick={() => onSelectLayer(null)}
          className={`w-full text-left rounded-xl p-2.5 text-xs font-medium transition border cursor-pointer ${
            activeLayerName === null
              ? 'border-primary bg-primary/10 text-primary font-semibold'
              : 'border-border/60 hover:bg-muted text-muted-foreground'
          }`}
        >
          None (Native Slices Only)
        </button>

        {layers.map((l) => {
          const isActive = activeLayerName === l.layer;
          return (
            <button
              key={l.layer}
              type="button"
              onClick={() => onSelectLayer(isActive ? null : l.layer)}
              className={`w-full text-left rounded-xl p-2.5 text-xs font-medium transition border cursor-pointer ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border/60 hover:bg-muted text-foreground'
              }`}
            >
              <div className="font-semibold flex items-center justify-between">
                <span>{l.title}</span>
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                Layer: {l.layer}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
