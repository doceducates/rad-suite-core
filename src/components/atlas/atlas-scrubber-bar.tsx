'use client';

// Layer 4: Adaptive Scrubber Bar & Windowed Filmstrip (<190 lines)
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Film } from 'lucide-react';

interface AtlasScrubberBarProps {
  currentSliceIndex: number;
  totalSlices: number;
  sliceSort: number;
  orientation?: string | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSliceChange: (index: number) => void;
  moduleCode?: string;
  seriesId?: number;
  slices?: Array<{ sort_order: number }>;
}

export function AtlasScrubberBar({
  currentSliceIndex,
  totalSlices,
  sliceSort,
  orientation,
  isPlaying,
  onTogglePlay,
  onSliceChange,
  moduleCode,
  seriesId,
  slices,
}: AtlasScrubberBarProps) {
  const [showFilmstrip, setShowFilmstrip] = useState(false);

  // RAM-safe windowed thumbnails: only render 5 slices around current index
  const windowRadius = 2;
  const startIdx = Math.max(0, currentSliceIndex - windowRadius);
  const endIdx = Math.min(totalSlices - 1, currentSliceIndex + windowRadius);
  const windowIndices: number[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    windowIndices.push(i);
  }

  return (
    <div className="flex flex-col border-t border-white/10 bg-black/60 hover:bg-black/85 backdrop-blur-md opacity-85 hover:opacity-100 transition-all text-white select-none shrink-0 z-20">
      {/* 1. Optional RAM-safe Windowed Filmstrip Preview */}
      {showFilmstrip && moduleCode && seriesId !== undefined && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-black/80 border-b border-white/10 overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2 duration-150">
          {windowIndices.map((idx) => {
            const isActive = idx === currentSliceIndex;
            const sortNum = slices?.[idx]?.sort_order ?? idx + 1;
            const thumbUrl = `/api/anatomy/image?module=${moduleCode}&series=${seriesId}&slice=${sortNum}`;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSliceChange(idx)}
                className={`group relative flex flex-col items-center rounded-lg border p-0.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/40 bg-primary/20 scale-105'
                    : 'border-white/20 bg-black/40 opacity-70 hover:opacity-100 hover:border-white/50'
                }`}
                title={`Jump to Slice ${sortNum}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt={`Slice ${sortNum}`}
                  loading="lazy"
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded pointer-events-none"
                />
                <span
                  className={`mt-0.5 font-mono text-[9px] ${
                    isActive ? 'font-bold text-primary' : 'text-white/60'
                  }`}
                >
                  #{sortNum}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Main High-Performance Scrubber Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 gap-2">
        {/* Playback Controls & Filmstrip Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSliceChange(Math.max(0, currentSliceIndex - 1))}
            disabled={currentSliceIndex <= 0}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Previous cross-section (Left Arrow)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer transition"
            title={isPlaying ? 'Pause Cine Auto-Scrub' : 'Play Cine Auto-Scrub'}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSliceChange(Math.min(totalSlices - 1, currentSliceIndex + 1))}
            disabled={currentSliceIndex >= totalSlices - 1}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Next cross-section (Right Arrow)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Filmstrip Toggle Button */}
          {moduleCode && (
            <button
              type="button"
              onClick={() => setShowFilmstrip(!showFilmstrip)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ml-1 ${
                showFilmstrip
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title="Toggle Windowed Filmstrip View"
            >
              <Film className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px]">Filmstrip</span>
            </button>
          )}
        </div>

        {/* Scrub Slider */}
        <div className="flex flex-1 items-center gap-2 sm:gap-3 px-2 sm:px-4 max-w-xl">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSlices - 1)}
            value={currentSliceIndex}
            onChange={(e) => onSliceChange(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-primary focus:outline-none"
          />
        </div>

        {/* Slice Counter & Orientation */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <span className="text-white/70 text-[11px] sm:text-xs">
            Slice <span className="text-white font-semibold">{sliceSort}</span> / {totalSlices}
          </span>
          {orientation && (
            <span className="hidden sm:inline rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-primary uppercase font-semibold">
              {orientation}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
