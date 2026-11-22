'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Search,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { useAtlasCompanion } from '@/hooks/use-atlas-companion';
import { AtlasCalloutOverlay } from '@/components/atlas/atlas-callout-overlay';
import { ZenAtlas3DCompanionPane } from '@/components/atlas/3d/ZenAtlas3DCompanionPane';
import type { AnatomyAnnotationPoint } from '@/types';

interface ZenAtlasCompanionPaneProps {
  modality?: string;
  studyDescription?: string;
}

export function ZenAtlasCompanionPane({
  modality = 'CT',
  studyDescription = '',
}: ZenAtlasCompanionPaneProps) {
  const {
    modules,
    activeCode,
    setActiveCode,
    moduleDetails,
    activeSeriesId,
    setActiveSeriesId,
    currentSeries,
    currentSliceIndex,
    setCurrentSliceIndex,
    currentSlice,
    totalSlices,
    annotations,
  } = useAtlasCompanion({ modality, studyDescription });

  const [language, setLanguage] = useState<'en' | 'la'>('en');
  const [dimensionMode, setDimensionMode] = useState<'2d' | '3d'>('2d');
  const [showPins, setShowPins] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartSlice, setDragStartSlice] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Pointer drag scrubbing
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setDragStartY(e.clientY);
    setDragStartSlice(currentSliceIndex);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY === null) return;
    const deltaY = e.clientY - dragStartY;
    const stepDelta = Math.round(deltaY / 12);
    const nextIndex = Math.min(Math.max(0, dragStartSlice + stepDelta), totalSlices - 1);
    if (nextIndex !== currentSliceIndex) setCurrentSliceIndex(nextIndex);
  };

  const handlePointerUp = () => setDragStartY(null);

  // Filtered points by search
  const visiblePoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return annotations.points;
    return annotations.points.filter(
      (p) => p.name_en.toLowerCase().includes(q) || (p.name_la || '').toLowerCase().includes(q)
    );
  }, [annotations.points, search]);

  const imageUrl = currentSeries
    ? `/api/anatomy/image?module=${activeCode}&series=${currentSeries.id}&slice=${currentSlice.sort_order}`
    : '';

  return (
    <div className="flex h-full flex-col bg-background text-foreground select-none overflow-hidden">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-border/40 bg-surface-container/60 px-2 py-1.5 gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <select
            value={activeCode}
            onChange={(e) => setActiveCode(e.target.value)}
            className="rounded border border-border/60 bg-background px-2 py-1 text-[11px] font-medium text-foreground truncate max-w-[200px]"
          >
            {modules.map((m) => (
              <option key={m.code} value={m.code}>
                {m.title}
              </option>
            ))}
          </select>

          {moduleDetails && moduleDetails.series.length > 1 && (
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {moduleDetails.series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSeriesId(s.id);
                    setCurrentSliceIndex(0);
                  }}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    s.id === activeSeriesId ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s.title.slice(0, 10)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setDimensionMode(dimensionMode === '2d' ? '3d' : '2d')}
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold border transition ${
              dimensionMode === '3d'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'text-muted-foreground hover:bg-muted border-transparent'
            }`}
            title="Toggle 2D Slices / 3D Anatomy Model"
          >
            {dimensionMode === '3d' ? '3D' : '2D'}
          </button>
          <button
            onClick={() => setLanguage(language === 'en' ? 'la' : 'en')}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Toggle Latin (Terminologia Anatomica) / English"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
          </button>
          <button
            onClick={() => setShowPins(!showPins)}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            title={showPins ? 'Hide pins' : 'Show pins'}
          >
            {showPins ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <a
            href="/atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Open Full Anatomy Atlas in New Tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* 2D / 3D Viewport Stage */}
      {dimensionMode === '3d' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          <ZenAtlas3DCompanionPane />
        </div>
      ) : (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex flex-1 items-center justify-center bg-black overflow-hidden cursor-ns-resize"
        >
          {imageUrl ? (
            <div className="relative flex items-center justify-center pointer-events-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Anatomy reference"
                className="max-h-[calc(100vh-220px)] max-w-[calc(100%-140px)] w-auto object-contain pointer-events-none"
              />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Loading anatomical cross-sections...</div>
          )}

          <AtlasCalloutOverlay
            containerRef={containerRef}
            imageRef={imageRef}
            points={visiblePoints}
            scoutLines={annotations.scout_lines}
            selectedStructureId={selectedStructureId}
            onSelectStructure={setSelectedStructureId}
            language={language}
            showPins={showPins}
            isQuizMode={false}
          />
        </div>
      )}

      {/* Bottom Scrubber & Structure Search */}
      <div className="border-t border-border/40 bg-surface-container/80 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentSliceIndex(Math.max(0, currentSliceIndex - 1))}
              disabled={currentSliceIndex <= 0}
              className="rounded p-1 hover:bg-muted disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px]">
              {currentSlice.sort_order} / {totalSlices}
            </span>
            <button
              onClick={() => setCurrentSliceIndex(Math.min(totalSlices - 1, currentSliceIndex + 1))}
              disabled={currentSliceIndex >= totalSlices - 1}
              className="rounded p-1 hover:bg-muted disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={totalSlices - 1}
            value={currentSliceIndex}
            onChange={(e) => setCurrentSliceIndex(Number(e.target.value))}
            className="flex-1 h-1 bg-muted accent-primary cursor-pointer"
          />
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${annotations.points.length} structures on this slice...`}
            className="w-full rounded border border-border/60 bg-background py-1 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
