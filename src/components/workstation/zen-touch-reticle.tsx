'use client';

import React from 'react';

export interface ZenTouchReticleProps {
  visible: boolean;
  x: number;
  y: number;
  text?: string;
  offsetY?: number;
}

export function ZenTouchReticle({
  visible,
  x,
  y,
  text,
  offsetY = -48,
}: ZenTouchReticleProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute pointer-events-none select-none z-30 transition-transform duration-75"
      style={{
        left: `${x}px`,
        top: `${y + offsetY}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Loupe Target Crosshairs */}
      <div className="relative w-12 h-12 rounded-full border-2 border-primary bg-black/40 backdrop-blur-xs flex items-center justify-center shadow-lg">
        {/* Horizontal crosshair */}
        <div className="absolute w-full h-[1.5px] bg-primary/80" />
        {/* Vertical crosshair */}
        <div className="absolute h-full w-[1.5px] bg-primary/80" />
        {/* Center reticle hole */}
        <div className="w-2.5 h-2.5 rounded-full border border-primary bg-transparent z-10" />
      </div>

      {/* Floating Value Tag */}
      {text && (
        <div className="mt-1 px-2 py-0.5 rounded bg-zinc-950/90 border border-zinc-700 text-white text-[10px] font-mono text-center shadow whitespace-nowrap">
          {text}
        </div>
      )}
    </div>
  );
}
