'use client';

// Layer 4: Atlas Slice Viewer Diagnostic Canvas (<270 lines)
import React, { useRef, useState, useEffect } from 'react';
import { AtlasScrubberBar } from './atlas-scrubber-bar';
import { AtlasCalloutOverlay } from './atlas-callout-overlay';
import { AtlasCanvasHud } from './atlas-canvas-hud';
import { AtlasSequenceDock } from './atlas-sequence-dock';
import { useAtlasViewportGestures } from '@/hooks/use-atlas-viewport-gestures';
import { useAtlasSlicePreloader } from '@/hooks/use-atlas-slice-preloader';
import type {
  AnatomySeries,
  AnatomyAnnotationPoint,
  AnatomyScoutLine,
  AnatomyLayerMask,
} from '@/types';

interface AtlasSliceViewerProps {
  moduleCode: string;
  series: AnatomySeries;
  seriesList?: AnatomySeries[];
  onSelectSeries?: (seriesId: number) => void;
  currentSliceIndex: number;
  onSliceChange: (index: number) => void;
  annotations: { points: AnatomyAnnotationPoint[]; scout_lines?: AnatomyScoutLine[] };
  layers?: AnatomyLayerMask[];
  activeLayerName?: string | null;
  onSelectLayer?: (layer: string | null) => void;
  maskOpacity?: number;
  onMaskOpacityChange?: (opacity: number) => void;
  focusedStructureId?: number | null;
  selectedStructureId?: number | null;
  onSelectStructure: (id: number | null) => void;
  language: 'en' | 'la';
  onToggleLanguage?: () => void;
  showPins: boolean;
  onTogglePins?: () => void;
  isQuizMode: boolean;
  onToggleQuiz?: () => void;
  quizTargetStructureId?: number | null;
  onQuizPinClick?: (structureId: number) => void;
  quizFeedback?: { correct: boolean; message: string } | null;
  onToggleSidebar?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function AtlasSliceViewer({
  moduleCode, series, seriesList, onSelectSeries,
  currentSliceIndex, onSliceChange, annotations,
  layers = [], activeLayerName, onSelectLayer,
  maskOpacity = 65, onMaskOpacityChange,
  focusedStructureId, selectedStructureId, onSelectStructure,
  language, onToggleLanguage, showPins, onTogglePins,
  isQuizMode, onToggleQuiz, quizTargetStructureId,
  onQuizPinClick, quizFeedback, onToggleSidebar,
  isFullscreen, onToggleFullscreen,
}: AtlasSliceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Pan & Zoom viewport state
  const [toolMode, setToolMode] = useState<'scrub' | 'pan'>('scrub');
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [maskError, setMaskError] = useState(false);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Load persisted text size from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rad_atlas_text_size') as 'sm' | 'md' | 'lg';
      if (saved === 'sm' || saved === 'md' || saved === 'lg') {
        setTextSize(saved);
      }
    } catch {}
  }, []);

  const handleCycleTextSize = () => {
    setTextSize((prev) => {
      const next = prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm';
      try {
        localStorage.setItem('rad_atlas_text_size', next);
      } catch {}
      return next;
    });
  };

  const totalSlices = series.slices.length || 1;
  const currentSlice = series.slices[currentSliceIndex] || { sort_order: 1 };
  const sliceSort = currentSlice.sort_order;

  const imageUrl = `/api/anatomy/image?module=${moduleCode}&series=${series.id}&slice=${sliceSort}`;
  const maskUrl = activeLayerName
    ? `/api/anatomy/mask?module=${moduleCode}&layer=${activeLayerName}&slice=${sliceSort}&globalSlice=${sliceSort}`
    : null;

  // Bounded off-thread preloader for instant zero-latency scrub switching
  useAtlasSlicePreloader({
    moduleCode,
    seriesId: series.id,
    currentSliceSort: sliceSort,
    totalSlices,
    activeLayerName,
  });

  useEffect(() => {
    setMaskError(false);
  }, [sliceSort, activeLayerName]);

  // RequestAnimationFrame Cine Playback Loop (drift-free 60fps-synced timing)
  const currentIndexRef = useRef(currentSliceIndex);
  currentIndexRef.current = currentSliceIndex;

  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let lastTime = performance.now();
    const frameInterval = 120; // ~8.3 fps clinical cine rate

    const loop = (now: number) => {
      const elapsed = now - lastTime;
      if (elapsed >= frameInterval) {
        lastTime = now - (elapsed % frameInterval);
        const next = (currentIndexRef.current + 1) % totalSlices;
        onSliceChange(next);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalSlices, onSliceChange]);

  const handleToggleMask = () => {
    if (activeLayerName) {
      onSelectLayer?.(null);
    } else if (layers.length > 0) {
      onSelectLayer?.(layers[0].layer);
    }
  };

  // Keyboard, Mouse & Touch Gestures (Shortcuts, Middle-drag Pan, Pinch-to-zoom)
  const gestures = useAtlasViewportGestures({
    containerRef,
    currentSliceIndex,
    totalSlices,
    onSliceChange,
    toolMode,
    setToolMode,
    zoom,
    setZoom,
    pan,
    setPan,
    onTogglePlay: () => setIsPlaying((p) => !p),
    onTogglePins,
    onToggleMask: handleToggleMask,
    onToggleQuiz,
    onToggleLanguage,
    onSelectStructure,
    onCycleTextSize: handleCycleTextSize,
    onToggleFullscreen,
  });

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-black select-none">
      {/* Viewport Canvas Area */}
      <div
        ref={containerRef}
        onPointerDown={gestures.handlePointerDown}
        onPointerMove={gestures.handlePointerMove}
        onPointerUp={gestures.handlePointerUp}
        onDoubleClick={gestures.handleDoubleClick}
        onTouchStart={gestures.handleTouchStart}
        onTouchMove={gestures.handleTouchMove}
        onTouchEnd={gestures.handleTouchEnd}
        className={`relative flex flex-1 items-center justify-center overflow-hidden touch-none ${
          toolMode === 'pan' ? (gestures.isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-ns-resize'
        }`}
      >
        {/* Centered Image Container — 0ms direct manipulation for 1:1 pinpoint accuracy */}
        <div
          className="relative flex items-center justify-center pointer-events-none will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt={`Cross-section slice ${sliceSort}`}
            className="max-h-[calc(100vh-140px)] sm:max-h-[calc(100vh-120px)] max-w-[calc(100%-80px)] sm:max-w-[calc(100%-140px)] md:max-w-[calc(100%-200px)] w-auto object-contain pointer-events-none"
          />

          {maskUrl && !maskError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={maskUrl}
              alt="Layer mask"
              onError={() => setMaskError(true)}
              onLoad={() => setMaskError(false)}
              style={{ opacity: maskOpacity / 100 }}
              className="absolute inset-0 h-full w-full object-contain pointer-events-none mix-blend-screen transition-opacity duration-150"
            />
          )}
        </div>

        {/* Dynamic Leader Lines Callout Overlay (Zero Scout Lines, Exact Realtime Tracking) */}
        <AtlasCalloutOverlay
          containerRef={containerRef}
          imageRef={imageRef}
          points={annotations.points}
          selectedStructureId={selectedStructureId}
          focusedStructureId={focusedStructureId}
          onSelectStructure={onSelectStructure}
          language={language}
          showPins={showPins}
          isQuizMode={isQuizMode}
          quizTargetStructureId={quizTargetStructureId}
          onQuizPinClick={onQuizPinClick}
          zoom={zoom}
          pan={pan}
          textSize={textSize}
        />

        {/* Floating Right Canvas HUD & Collapsible FAB */}
        <AtlasCanvasHud
          toolMode={toolMode}
          onToolModeChange={setToolMode}
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(3.5, +(z + 0.25).toFixed(2)))}
          onZoomOut={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
          onResetView={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          showPins={showPins}
          onTogglePins={onTogglePins || (() => {})}
          hasActiveMask={Boolean(maskUrl && !maskError)}
          hasMasksAvailable={layers.length > 0}
          onToggleMask={handleToggleMask}
          maskOpacity={maskOpacity}
          onMaskOpacityChange={onMaskOpacityChange}
          onToggleSidebar={onToggleSidebar}
          language={language}
          onToggleLanguage={onToggleLanguage}
          isQuizMode={isQuizMode}
          onToggleQuiz={onToggleQuiz}
          textSize={textSize}
          onCycleTextSize={handleCycleTextSize}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />

        {/* Left Sequence / Plane Explorer Dock (Scrollable with Mouse Wheel) */}
        {seriesList && onSelectSeries && (
          <AtlasSequenceDock
            seriesList={seriesList}
            activeSeriesId={series.id}
            onSelectSeries={onSelectSeries}
          />
        )}

        {/* Quiz Feedback Banner */}
        {quizFeedback && (
          <div
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-xl px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
              quizFeedback.correct ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white animate-shake'
            }`}
          >
            {quizFeedback.message}
          </div>
        )}
      </div>

      {/* Bottom Scrubber & Windowed Filmstrip */}
      <AtlasScrubberBar
        currentSliceIndex={currentSliceIndex}
        totalSlices={totalSlices}
        sliceSort={sliceSort}
        orientation={currentSlice.orientation}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onSliceChange={onSliceChange}
        moduleCode={moduleCode}
        seriesId={series.id}
        slices={series.slices}
      />
    </div>
  );
}
