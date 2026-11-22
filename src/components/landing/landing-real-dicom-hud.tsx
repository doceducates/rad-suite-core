'use client';

import React from 'react';

interface LandingRealDicomHudProps {
  slice: number;
  totalSlices: number;
  zoom: number;
  ww: number;
  wc: number;
  patientId?: string;
}

export function LandingRealDicomHud({
  slice,
  totalSlices,
  zoom,
  ww,
  wc,
  patientId = 'VS-MC-RC-063',
}: LandingRealDicomHudProps) {
  return (
    <>
      {/* HUD Top-Left */}
      <div className="absolute top-3 left-3 font-mono text-[11px] text-primary pointer-events-none z-10 leading-relaxed bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
        <div className="font-bold text-white tracking-wide">{patientId}</div>
        <div className="text-zinc-400 text-[10px]">MR HEAD • ROUTINE STEALTH</div>
        <div className="text-zinc-400 text-[10px]">T1 AXIAL 2.0MM</div>
      </div>

      {/* HUD Top-Right */}
      <div className="absolute top-3 right-3 text-right font-mono text-[11px] text-zinc-400 pointer-events-none z-10 leading-relaxed bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
        <div className="text-emerald-400 font-semibold flex items-center justify-end gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>WebGL2 60 FPS</span>
        </div>
        <div className="text-[10px] text-zinc-400">256 x 256 Matrix</div>
        <div className="text-[10px] text-zinc-500">TCIA Vestibular Series</div>
      </div>

      {/* HUD Bottom-Left */}
      <div className="absolute bottom-3 left-3 font-mono text-[11px] text-zinc-400 pointer-events-none z-10 leading-relaxed bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
        <div className="text-white font-semibold">
          Slice: <span className="text-primary font-bold">{slice}</span> / {totalSlices}
        </div>
        <div className="text-[10px] text-zinc-400">Zoom: {Math.round(zoom * 100)}%</div>
      </div>

      {/* HUD Bottom-Right */}
      <div className="absolute bottom-3 right-3 text-right font-mono text-[11px] text-zinc-400 pointer-events-none z-10 leading-relaxed bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
        <div className="text-white font-semibold">
          W: <span className="text-primary">{ww}</span> L: <span className="text-primary">{wc}</span>
        </div>
        <div className="text-[10px] text-zinc-500">Thickness: 2.0mm</div>
      </div>
    </>
  );
}
