'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { DicomVolumeData } from '@/services/dicom-volume-builder.service';
import {
  extractAxialSlice,
  extractCoronalSlice,
  extractSagittalSlice,
} from '@/services/mpr-reslice.service';
import { ZenMprPane } from './zen-mpr-pane';

interface ZenMprViewProps {
  volumeData: DicomVolumeData;
}

export function ZenMprView({ volumeData }: ZenMprViewProps) {
  const { width, height, depth } = volumeData;

  const [pt, setPt] = useState<{ x: number; y: number; z: number }>({
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
    z: Math.floor(depth / 2),
  });

  const axialImg = useMemo(() => extractAxialSlice(volumeData, pt.z), [volumeData, pt.z]);
  const coronalImg = useMemo(() => extractCoronalSlice(volumeData, pt.y), [volumeData, pt.y]);
  const sagittalImg = useMemo(() => extractSagittalSlice(volumeData, pt.x), [volumeData, pt.x]);

  const updateZ = useCallback((delta: number) => {
    setPt((p) => ({ ...p, z: Math.max(0, Math.min(depth - 1, p.z + delta)) }));
  }, [depth]);

  const updateY = useCallback((delta: number) => {
    setPt((p) => ({ ...p, y: Math.max(0, Math.min(height - 1, p.y + delta)) }));
  }, [height]);

  const updateX = useCallback((delta: number) => {
    setPt((p) => ({ ...p, x: Math.max(0, Math.min(width - 1, p.x + delta)) }));
  }, [width]);

  const resetCrosshair = () => {
    setPt({
      x: Math.floor(width / 2),
      y: Math.floor(height / 2),
      z: Math.floor(depth / 2),
    });
  };

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 bg-zinc-950 p-1 gap-1 select-none overflow-hidden">
      {/* 1. Axial Pane (Top Left) - Vitrea Standard Red */}
      <ZenMprPane
        title="AXIAL (XY)"
        orientation="AXIAL"
        sliceImage={axialImg}
        currentSlice={pt.z}
        maxSlices={depth}
        crosshairU={pt.x / width}
        crosshairV={pt.y / height}
        onMoveCrosshair={(u, v) => setPt((p) => ({ ...p, x: Math.round(u * (width - 1)), y: Math.round(v * (height - 1)) }))}
        onScrollSlice={updateZ}
        aspectRatio={axialImg.width / axialImg.height}
        colorClass="text-red-400"
      />

      {/* 2. Coronal Pane (Top Right) - Vitrea Standard Green */}
      <ZenMprPane
        title="CORONAL (XZ)"
        orientation="CORONAL"
        sliceImage={coronalImg}
        currentSlice={pt.y}
        maxSlices={height}
        crosshairU={pt.x / width}
        crosshairV={1 - pt.z / depth}
        onMoveCrosshair={(u, v) => setPt((p) => ({ ...p, x: Math.round(u * (width - 1)), z: Math.round((1 - v) * (depth - 1)) }))}
        onScrollSlice={updateY}
        aspectRatio={coronalImg.width / coronalImg.height}
        colorClass="text-emerald-400"
      />

      {/* 3. Sagittal Pane (Bottom Left) - Vitrea Standard Blue */}
      <ZenMprPane
        title="SAGITTAL (YZ)"
        orientation="SAGITTAL"
        sliceImage={sagittalImg}
        currentSlice={pt.x}
        maxSlices={width}
        crosshairU={pt.y / height}
        crosshairV={1 - pt.z / depth}
        onMoveCrosshair={(u, v) => setPt((p) => ({ ...p, y: Math.round(u * (height - 1)), z: Math.round((1 - v) * (depth - 1)) }))}
        onScrollSlice={updateX}
        aspectRatio={sagittalImg.width / sagittalImg.height}
        colorClass="text-blue-400"
      />

      {/* 4. MPR Tri-Planar HUD & Crosshair Coordinates (Bottom Right) */}
      <div className="relative w-full h-full bg-zinc-900/60 border border-outline-variant/30 rounded flex flex-col items-center justify-center p-4 gap-3 text-center">
        <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase">
          <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
          Orthogonal MPR Engine
        </div>

        <div className="grid grid-cols-3 gap-2 w-full max-w-xs font-mono text-[11px]">
          <div className="bg-black/40 p-2 rounded border border-red-500/30">
            <div className="text-red-400 font-bold">Axial (Z)</div>
            <div className="text-white text-sm font-semibold">{pt.z + 1}</div>
          </div>
          <div className="bg-black/40 p-2 rounded border border-emerald-500/30">
            <div className="text-emerald-400 font-bold">Coronal (Y)</div>
            <div className="text-white text-sm font-semibold">{pt.y + 1}</div>
          </div>
          <div className="bg-black/40 p-2 rounded border border-blue-500/30">
            <div className="text-blue-400 font-bold">Sagittal (X)</div>
            <div className="text-white text-sm font-semibold">{pt.x + 1}</div>
          </div>
        </div>

        <div className="text-[10px] text-zinc-400 font-mono">
          Dimensions: {width} × {height} × {depth} voxels
        </div>

        <button
          type="button"
          onClick={resetCrosshair}
          className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded text-xs font-mono font-semibold transition-colors cursor-pointer"
        >
          Reset 3D Crosshairs
        </button>
      </div>
    </div>
  );
}
