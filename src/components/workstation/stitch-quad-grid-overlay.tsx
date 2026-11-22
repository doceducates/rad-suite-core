'use client';

import React from 'react';

interface StitchGridOverlayProps {
  paneLabel: string;
  isActive: boolean;
  isDragOver: boolean;
  totalPanes: number;
}

export function StitchGridOverlay({
  paneLabel,
  isDragOver,
}: StitchGridOverlayProps) {
  return (
    <>
      {/* Drag & Drop Target Glow Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-primary/20 backdrop-blur-xs border-2 border-primary rounded-xl pointer-events-none transition-all animate-pulse">
          <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center border border-primary text-white mb-2 shadow-lg">
            <span className="material-symbols-outlined text-2xl text-primary">download</span>
          </div>
          <span className="text-xs font-mono font-bold text-white bg-black/80 px-3 py-1 rounded-md border border-primary/40 shadow-md">
            Drop Series into {paneLabel}
          </span>
        </div>
      )}
    </>
  );
}

export function StitchMaximizedBadge({
  paneLabel,
  gridCols,
  gridRows,
  onRestore,
}: {
  paneLabel: string;
  gridCols: number;
  gridRows: number;
  onRestore: () => void;
}) {
  return (
    <div className="absolute top-2.5 right-3 z-30 flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRestore();
        }}
        className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-white font-mono text-[10px] font-bold rounded shadow-lg flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
        title="Restore grid layout (Esc or Double-Click)"
      >
        <span className="material-symbols-outlined text-sm">grid_view</span>
        <span>RESTORE GRID ({gridCols}×{gridRows}) · ESC</span>
      </button>
      <span className="px-2 py-0.5 bg-black/80 border border-outline-variant text-secondary font-mono text-[9px] font-bold rounded shadow">
        EXPANDED ({paneLabel})
      </span>
    </div>
  );
}
