'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseDicomBuffer, renderDicomPixelsToImageData, type ParsedDicomFile } from '@/services/dicom-loader.service';
import { LandingRealDicomToolbar } from './landing-real-dicom-toolbar';
import { LandingRealDicomHud } from './landing-real-dicom-hud';

export type DicomTool = 'wl' | 'pan' | 'zoom' | 'length';

interface Measurement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distMm: number;
}

const TOTAL_SLICES = 90;
const INITIAL_SLICE = 45; // Acoustic meatus / cerebellopontine angle level
const sliceCache = new Map<number, ParsedDicomFile>();

export function LandingRealDicomViewer() {
  const [slice, setSlice] = useState(INITIAL_SLICE);
  const [tool, setTool] = useState<DicomTool>('wl');
  const [ww, setWw] = useState(415);
  const [wc, setWc] = useState(207);
  const [zoom, setZoom] = useState(1.15);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [invert, setInvert] = useState(false);
  const [rotate, setRotate] = useState(0);
  const [cine, setCine] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMeasure, setActiveMeasure] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [currentDicom, setCurrentDicom] = useState<ParsedDicomFile | null>(null);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialDragValues = useRef({ ww: 415, wc: 207, panX: 0, panY: 0, zoom: 1.15 });

  // Non-passive wheel event listener to strictly prevent page scroll when mouse is over viewport
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.deltaY > 0) {
        setSlice((s) => Math.min(TOTAL_SLICES, s + 1));
      } else if (e.deltaY < 0) {
        setSlice((s) => Math.max(1, s - 1));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const loadSlice = useCallback(async (sliceNum: number) => {
    if (sliceCache.has(sliceNum)) {
      const cached = sliceCache.get(sliceNum)!;
      setCurrentDicom(cached);
      return cached;
    }
    try {
      const pad = String(sliceNum).padStart(4, '0');
      const res = await fetch(`/cases/vestibular-schwannoma/instance-${pad}.dcm`);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const parsed = parseDicomBuffer(buf);
      sliceCache.set(sliceNum, parsed);
      setCurrentDicom(parsed);
      return parsed;
    } catch (err) {
      console.error('Error loading slice:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      await loadSlice(INITIAL_SLICE);
      if (cancelled) return;
      setLoading(false);
      for (let s = 35; s <= 55; s++) {
        if (!sliceCache.has(s) && !cancelled) loadSlice(s);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [loadSlice]);

  useEffect(() => {
    loadSlice(slice);
  }, [slice, loadSlice]);

  useEffect(() => {
    if (!cine) return;
    const interval = setInterval(() => {
      setSlice((prev) => (prev >= TOTAL_SLICES ? 1 : prev + 1));
    }, 70);
    return () => clearInterval(interval);
  }, [cine]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentDicom) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = currentDicom.meta.columns;
    canvas.height = currentDicom.meta.rows;

    const imgData = renderDicomPixelsToImageData(ctx, currentDicom.pixelData, currentDicom.meta, ww, wc, invert);
    ctx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.strokeStyle = '#8ecf9e';
    ctx.fillStyle = '#8ecf9e';
    ctx.lineWidth = 1.5;
    ctx.font = '11px JetBrains Mono, monospace';

    const drawLine = (m: Measurement) => {
      ctx.beginPath();
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(m.x1, m.y1, 2.5, 0, Math.PI * 2);
      ctx.arc(m.x2, m.y2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`${m.distMm.toFixed(1)} mm`, (m.x1 + m.x2) / 2 + 5, (m.y1 + m.y2) / 2 - 5);
    };

    measurements.forEach(drawLine);
    if (activeMeasure) {
      const spacing = currentDicom.meta.pixelSpacing[0] || 0.898;
      const dx = (activeMeasure.x2 - activeMeasure.x1) * spacing;
      const dy = (activeMeasure.y2 - activeMeasure.y1) * spacing;
      drawLine({ ...activeMeasure, distMm: Math.sqrt(dx * dx + dy * dy) });
    }
    ctx.restore();
  }, [currentDicom, ww, wc, invert, measurements, activeMeasure]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialDragValues.current = { ww, wc, panX: pan.x, panY: pan.y, zoom };

    if (tool === 'length' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (256 / rect.width);
      const y = (e.clientY - rect.top) * (256 / rect.height);
      setActiveMeasure({ x1: x, y1: y, x2: x, y2: y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (tool === 'wl') {
      setWw(Math.max(10, Math.round(initialDragValues.current.ww + dx * 2)));
      setWc(Math.round(initialDragValues.current.wc - dy * 1.5));
    } else if (tool === 'pan') {
      setPan({ x: initialDragValues.current.panX + dx, y: initialDragValues.current.panY + dy });
    } else if (tool === 'zoom') {
      setZoom(Math.max(0.5, Math.min(4, initialDragValues.current.zoom - dy * 0.008)));
    } else if (tool === 'length' && activeMeasure && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setActiveMeasure((prev) => prev ? {
        ...prev,
        x2: (e.clientX - rect.left) * (256 / rect.width),
        y2: (e.clientY - rect.top) * (256 / rect.height),
      } : null);
    }
  };

  const handlePointerUp = () => {
    if (tool === 'length' && activeMeasure && currentDicom) {
      const spacing = currentDicom.meta.pixelSpacing[0] || 0.898;
      const dx = (activeMeasure.x2 - activeMeasure.x1) * spacing;
      const dy = (activeMeasure.y2 - activeMeasure.y1) * spacing;
      const distMm = Math.sqrt(dx * dx + dy * dy);
      if (distMm > 2) setMeasurements((prev) => [...prev, { ...activeMeasure, distMm }]);
      setActiveMeasure(null);
    }
    isDragging.current = false;
  };

  const handleReset = () => {
    setWw(415);
    setWc(207);
    setZoom(1.15);
    setPan({ x: 0, y: 0 });
    setRotate(0);
    setInvert(false);
    setMeasurements([]);
  };

  return (
    <div className="flex flex-col h-full bg-[#03060a] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl select-none min-w-0">
      <LandingRealDicomToolbar
        tool={tool}
        setTool={setTool}
        setWw={setWw}
        setWc={setWc}
        cine={cine}
        setCine={setCine}
        invert={invert}
        setInvert={setInvert}
        setRotate={setRotate}
        onReset={handleReset}
      />

      <div
        ref={viewportRef}
        className="relative flex-1 min-h-[360px] sm:min-h-[420px] flex items-center justify-center overflow-hidden cursor-crosshair bg-black"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <LandingRealDicomHud
          slice={slice}
          totalSlices={TOTAL_SLICES}
          zoom={zoom}
          ww={ww}
          wc={wc}
        />

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotate}deg)`,
            transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative inline-block shadow-2xl"
        >
          <canvas
            ref={canvasRef}
            className="w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] image-rendering-pixelated rounded-sm"
          />
        </div>

        {loading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-mono text-xs text-primary z-20">
            Streaming Real MRI Slices...
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-zinc-900/90 border-t border-zinc-800 flex items-center gap-3 font-mono text-xs text-zinc-400">
        <span className="text-[11px] text-zinc-400 shrink-0">Scrub:</span>
        <input
          type="range"
          min={1}
          max={TOTAL_SLICES}
          value={slice}
          onChange={(e) => setSlice(Number(e.target.value))}
          className="flex-1 accent-primary h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
        />
        <span className="text-primary font-bold w-12 text-right shrink-0">
          {slice}/{TOTAL_SLICES}
        </span>
      </div>
    </div>
  );
}
