'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import type { OrthogonalSliceImage } from '@/services/mpr-reslice.service';
import { getOrientationMarkers } from '@/services/dicom-geometry.service';

interface ZenMprPaneProps {
  title: string;
  orientation?: 'AXIAL' | 'SAGITTAL' | 'CORONAL';
  sliceImage: OrthogonalSliceImage;
  currentSlice: number;
  maxSlices: number;
  crosshairU: number; // 0..1 normalized horizontal crosshair position
  crosshairV: number; // 0..1 normalized vertical crosshair position
  onMoveCrosshair: (u: number, v: number) => void;
  onScrollSlice: (delta: number) => void;
  aspectRatio?: number;
  colorClass?: string;
}

export function ZenMprPane({
  title,
  orientation,
  sliceImage,
  currentSlice,
  maxSlices,
  crosshairU,
  crosshairV,
  onMoveCrosshair,
  onScrollSlice,
  aspectRatio = 1,
  colorClass = 'text-primary',
}: ZenMprPaneProps) {
  const markers = orientation ? getOrientationMarkers(orientation) : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Render slice image into canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sliceImage) return;

    if (canvas.width !== sliceImage.width || canvas.height !== sliceImage.height) {
      canvas.width = sliceImage.width;
      canvas.height = sliceImage.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(sliceImage.width, sliceImage.height);
    imgData.data.set(sliceImage.rgbaData);
    ctx.putImageData(imgData, 0, 0);
  }, [sliceImage]);

  const handlePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onMoveCrosshair(u, v);
  }, [onMoveCrosshair]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    onScrollSlice(delta);
  }, [onScrollSlice]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointer}
      onPointerMove={handlePointer}
      className="relative w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden border border-outline-variant/30 cursor-crosshair select-none group"
    >
      {/* Resliced Canvas */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center"
        style={{ aspectRatio: `${aspectRatio}` }}
      >
        <canvas ref={canvasRef} className="w-full h-full object-contain block image-rendering-pixelated" />

        {/* Orthogonal Crosshair Overlay */}
        <div
          className="absolute top-0 bottom-0 w-px bg-amber-400/80 pointer-events-none shadow-[0_0_4px_rgba(251,191,36,0.6)]"
          style={{ left: `${crosshairU * 100}%` }}
        />
        <div
          className="absolute left-0 right-0 h-px bg-primary/80 pointer-events-none shadow-[0_0_4px_rgba(142,207,158,0.6)]"
          style={{ top: `${crosshairV * 100}%` }}
        />
      </div>

      {/* Direction Markers */}
      {markers && (
        <>
          <span className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none z-10">
            {markers.top}
          </span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none z-10">
            {markers.bottom}
          </span>
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none z-10">
            {markers.left}
          </span>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-neutral-400 drop-shadow-md pointer-events-none select-none z-10">
            {markers.right}
          </span>
        </>
      )}

      {/* Pane Label & Slice Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono pointer-events-none border border-white/10">
        <span className={`font-bold ${colorClass}`}>{title}</span>
        <span className="text-white/70">
          {currentSlice + 1}/{maxSlices}
        </span>
      </div>
    </div>
  );
}
