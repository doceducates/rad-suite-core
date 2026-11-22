'use client';

import React from 'react';

interface CineControlsProps {
  isCinePlaying: boolean;
  onToggleCine: () => void;
  onStepSlice: (dir: -1 | 1) => void;
}

export function CineControls({ isCinePlaying, onToggleCine, onStepSlice }: CineControlsProps) {
  return (
    <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/40">
      <button
        type="button"
        onClick={() => onStepSlice(-1)}
        className="w-5 h-5 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer"
        title="Step Previous Slice"
      >
        <span className="material-symbols-outlined text-[13px]">skip_previous</span>
      </button>
      <button
        type="button"
        onClick={onToggleCine}
        className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
          isCinePlaying
            ? 'bg-primary text-white'
            : 'bg-primary/15 text-primary hover:bg-primary hover:text-white'
        }`}
        title="Cine Loop Playback (C)"
      >
        <span className="material-symbols-outlined text-[14px]">
          {isCinePlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onStepSlice(1)}
        className="w-5 h-5 flex items-center justify-center rounded text-on-surface-variant hover:text-primary hover:bg-surface-container cursor-pointer"
        title="Step Next Slice"
      >
        <span className="material-symbols-outlined text-[13px]">skip_next</span>
      </button>
    </div>
  );
}
