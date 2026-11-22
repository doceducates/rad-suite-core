'use client';

import React from 'react';

interface Zen3DPointBannerProps {
  point3D: [number, number, number];
  isVisible: boolean;
  onToggleVisibility: () => void;
  onClear: () => void;
}

export function Zen3DPointBanner({
  point3D,
  isVisible,
  onToggleVisibility,
  onClear,
}: Zen3DPointBannerProps) {
  return (
    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-35 flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high/95 backdrop-blur-md border border-amber-500/50 shadow-xl text-[11px] font-sans select-none">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <span className="font-mono text-amber-300 font-semibold whitespace-nowrap">
        3D Localizer Point
      </span>
      <div className="w-px h-3.5 bg-outline-variant/60 mx-0.5" />
      <button
        type="button"
        onClick={onToggleVisibility}
        className={`px-2 py-0.5 rounded-full flex items-center gap-1 font-medium transition-colors cursor-pointer text-[10px] ${
          isVisible
            ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
            : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
        }`}
        title="Toggle 3D Crosshair Reticle Visibility (H)"
      >
        <span className="material-symbols-outlined text-[13px]">
          {isVisible ? 'visibility_off' : 'visibility'}
        </span>
        <span>{isVisible ? 'Hide Reticle' : 'Show Reticle'}</span>
        <kbd className="text-[9px] px-1 bg-black/30 rounded text-on-surface-variant font-mono">H</kbd>
      </button>
      <button
        type="button"
        onClick={onClear}
        className="px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
        title="Clear 3D Point (Esc)"
      >
        <span className="material-symbols-outlined text-[13px]">close</span>
        <span>Clear</span>
        <kbd className="text-[9px] px-1 bg-black/30 rounded text-on-surface-variant font-mono">Esc</kbd>
      </button>
    </div>
  );
}
