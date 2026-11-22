'use client';

import { useEffect, useRef, useCallback } from 'react';
import { type DicomTool } from './dicom-toolbar';
import { useDicomViewport } from '@/hooks/use-dicom-viewport';
import { drawMedicalDicomSlice } from './dicom-canvas-renderer';
import { WINDOW_PRESETS } from '@/services/dicom.service';

interface DicomCellViewportProps {
  cellId: string;
  seriesList: any[];
  seriesIndex: number;
  onSelectSeries: (index: number) => void;
  activeTool: DicomTool;
  modality: string;
  isActive: boolean;
  onActivate: () => void;
  syncedSlice?: number;
}

export function DicomCellViewport({
  seriesList,
  seriesIndex,
  onSelectSeries,
  activeTool,
  modality,
  isActive,
  onActivate,
  syncedSlice,
}: DicomCellViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentSeries = seriesList[seriesIndex] || seriesList[0];
  const maxSlices = currentSeries?.instances?.length || 24;
  const presetKey = currentSeries?.windowPreset || 'brain';

  const {
    zoom, pan, slice, setSlice, ww, wc,
    handleWheel, handlePointerDown, handlePointerMove, handlePointerUp,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useDicomViewport({
    maxSlices,
    initialWw: WINDOW_PRESETS[presetKey as keyof typeof WINDOW_PRESETS]?.ww || 350,
    initialWc: WINDOW_PRESETS[presetKey as keyof typeof WINDOW_PRESETS]?.wc || 50,
  });

  // Handle synchronized scrolling if enabled
  useEffect(() => {
    if (syncedSlice !== undefined && syncedSlice >= 0) {
      setSlice(syncedSlice % maxSlices);
    }
  }, [syncedSlice, maxSlices, setSlice]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 480;
    canvas.height = 380;
    drawMedicalDicomSlice({
      ctx,
      width: canvas.width,
      height: canvas.height,
      slice,
      maxSlices,
      modality,
      preset: presetKey,
      sequenceKey: currentSeries?.sequenceKey,
      invert: false,
      rotate: 0,
      flip: false,
      zoom,
      pan,
    });
  }, [slice, maxSlices, modality, presetKey, currentSeries?.sequenceKey, zoom, pan]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div
      onClick={onActivate}
      className={`relative flex flex-col bg-black rounded-lg overflow-hidden border transition-all ${
        isActive ? 'border-primary ring-1 ring-primary/50 shadow-md' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Mini Viewport Header with Sequence Dropdown */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs">
        <select
          value={seriesIndex}
          onChange={(e) => onSelectSeries(Number(e.target.value))}
          className="bg-zinc-800 text-primary font-semibold text-[11px] rounded px-2 py-0.5 border border-zinc-700 focus:outline-none focus:border-primary cursor-pointer"
        >
          {seriesList.map((s, idx) => (
            <option key={s.id || idx} value={idx} className="bg-zinc-900 text-zinc-100">
              {s.description || `Series ${idx + 1}`} ({s.instances?.length || 24} img)
            </option>
          ))}
        </select>
        <span className="text-[10px] font-mono text-zinc-400">
          {currentSeries?.orientation || 'Axial'} • {currentSeries?.thickness || '5mm'}
        </span>
      </div>

      {/* Interactive Medical Viewport Canvas */}
      <div
        className="relative aspect-[4/3] bg-black flex items-center justify-center select-none overflow-hidden touch-none"
        onWheel={(e) => handleWheel(e, activeTool)}
        onPointerDown={(e) => { onActivate(); handlePointerDown(e); }}
        onPointerMove={(e) => handlePointerMove(e, activeTool)}
        onPointerUp={handlePointerUp}
        onTouchStart={(e) => { onActivate(); handleTouchStart(e); }}
        onTouchMove={(e) => handleTouchMove(e, activeTool)}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} width={480} height={380} className="w-full h-full object-contain cursor-crosshair" />

        {/* HUD Overlay Top-Left */}
        <div className="absolute top-2 left-2 text-[10px] font-mono text-primary pointer-events-none drop-shadow">
          <div>{currentSeries?.description}</div>
          <div className="text-zinc-400">Im: {slice + 1}/{maxSlices}</div>
        </div>

        {/* HUD Overlay Bottom-Right */}
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-zinc-400 pointer-events-none text-right drop-shadow">
          <div>W: {ww} C: {wc}</div>
          <div>Zoom: {zoom.toFixed(1)}x</div>
        </div>
      </div>

      {/* Slice Scroller */}
      <div className="px-2 py-1 bg-zinc-900/95 border-t border-zinc-800/80 flex items-center gap-2 text-[10px] text-zinc-400">
        <span className="font-mono">Sl</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, maxSlices - 1)}
          value={slice}
          onChange={(e) => setSlice(Number(e.target.value))}
          className="flex-1 accent-primary h-1 cursor-pointer"
        />
        <span className="font-mono text-zinc-300 min-w-[42px] text-right">{slice + 1}/{maxSlices}</span>
      </div>
    </div>
  );
}
