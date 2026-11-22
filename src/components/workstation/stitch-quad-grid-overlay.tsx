'use client';

import React from 'react';
import { Link2, Unlink, Camera, X, Maximize2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StitchGridOverlayProps {
  paneIdx: number;
  paneLabel: string;
  isActive: boolean;
  isDragOver: boolean;
  totalPanes: number;
  isLinked?: boolean;
  onToggleLink?: (paneIdx: number) => void;
  onSnapshot?: (paneIdx: number) => void;
  onClose?: (paneIdx: number) => void;
  onMaximize?: (paneIdx: number) => void;
}

export function StitchGridOverlay({
  paneIdx,
  paneLabel,
  isDragOver,
  isLinked = true,
  onToggleLink,
  onSnapshot,
  onClose,
  onMaximize,
}: StitchGridOverlayProps) {
  const stopP = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      {/* Vitrea MMV Floating Pane Mini-Toolbar (Top Right) */}
      <div
        onClick={stopP}
        className="absolute top-1.5 right-1.5 z-30 flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-container-high/80 backdrop-blur-md border border-outline-variant/60 shadow-md select-none transition-opacity duration-150"
      >
        {/* Link / Unlink Sync Toggle */}
        {onToggleLink && (
          <button
            type="button"
            onClick={(e) => {
              stopP(e);
              onToggleLink(paneIdx);
            }}
            className={cn(
              'h-5 w-5 rounded-md flex items-center justify-center transition-colors cursor-pointer border text-xs',
              isLinked
                ? 'bg-primary/25 border-primary/60 text-primary shadow-2xs font-bold'
                : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-container-highest'
            )}
            title={isLinked ? 'Unlink Viewport (Currently Synced in Lockstep)' : 'Link Viewport (Currently Independent)'}
            aria-label={isLinked ? 'Unlink Viewport' : 'Link Viewport'}
          >
            {isLinked ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3 text-amber-400" />}
          </button>
        )}

        {/* Snapshot Capture */}
        {onSnapshot && (
          <button
            type="button"
            onClick={(e) => {
              stopP(e);
              onSnapshot(paneIdx);
            }}
            className="h-5 w-5 rounded-md flex items-center justify-center bg-transparent hover:bg-surface-container-highest text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-transparent text-xs"
            title="Capture Snapshot of this Pane"
            aria-label="Capture Snapshot"
          >
            <Camera className="w-3 h-3" />
          </button>
        )}

        {/* Maximize / Restore */}
        {onMaximize && (
          <button
            type="button"
            onClick={(e) => {
              stopP(e);
              onMaximize(paneIdx);
            }}
            className="h-5 w-5 rounded-md flex items-center justify-center bg-transparent hover:bg-surface-container-highest text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-transparent text-xs"
            title="Maximize Viewport (Double-Click)"
            aria-label="Maximize Viewport"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}

        {/* Close Viewport */}
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              stopP(e);
              onClose(paneIdx);
            }}
            className="h-5 w-5 rounded-md flex items-center justify-center bg-transparent hover:bg-red-500/20 hover:text-red-400 text-muted-foreground transition-colors cursor-pointer border border-transparent text-xs"
            title="Close / Reset this Viewport"
            aria-label="Close Viewport"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Drag & Drop Target Glow Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-primary/20 backdrop-blur-xs border-2 border-primary rounded-xl pointer-events-none transition-all animate-pulse">
          <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center border border-primary text-white mb-1.5 shadow-lg">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xs font-mono font-bold text-white bg-black/85 px-3 py-1 rounded-md border border-primary/40 shadow-md">
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
    <div className="absolute top-2.5 right-3 z-40 flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRestore();
        }}
        className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-white font-mono text-[10px] font-bold rounded shadow-lg flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
        title="Restore grid layout (Esc or Double-Click)"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        <span>RESTORE GRID ({gridCols}×{gridRows}) · ESC</span>
      </button>
      <span className="px-2 py-0.5 bg-black/80 border border-outline-variant text-secondary font-mono text-[9px] font-bold rounded shadow">
        EXPANDED ({paneLabel})
      </span>
    </div>
  );
}
