'use client';

import React from 'react';
import { Maximize2, X, Move, RotateCcw, Minus } from 'lucide-react';
import { ZenDicomViewer } from './zen-dicom-viewer';
import { StitchPipResizeHandles } from './stitch-pip-resize-handles';
import { usePipWindow } from '@/hooks/use-pip-window';
import { cn } from '@/lib/utils';

interface StitchPipViewportProps {
  accessionNumber: string;
  modality: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: any[];
  activeSeriesIndex?: number;
  seriesName?: string;
  onExpand?: () => void;
  onClose?: () => void;
}

export function StitchPipViewport({
  accessionNumber,
  modality,
  isLocalCase,
  localCaseId,
  localSeries = [],
  activeSeriesIndex = 0,
  seriesName,
  onExpand,
  onClose,
}: StitchPipViewportProps) {
  const {
    rect,
    isMinimized,
    setIsMinimized,
    isDragging,
    isResizing,
    handleDragMouseDown,
    handleResizeMouseDown,
    resetToDefault,
  } = usePipWindow();

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-6 z-40 px-3.5 py-2 rounded-xl bg-surface-container-high/95 backdrop-blur-md border border-primary/50 text-primary text-xs font-mono flex items-center gap-2 shadow-2xl hover:bg-surface-container transition-all hover:scale-105"
        title="Restore Floating DICOM PiP"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="font-semibold">PiP Viewport</span>
        {seriesName && <span className="text-secondary truncate max-w-[120px]">• {seriesName}</span>}
      </button>
    );
  }

  return (
    <div
      style={{
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
      }}
      className={cn(
        'fixed z-40 bg-black rounded-2xl border border-primary/40 shadow-2xl flex flex-col overflow-visible select-none',
        isDragging && 'shadow-primary/20 ring-2 ring-primary/40 opacity-95 cursor-grabbing',
        isResizing && 'ring-1 ring-primary/40'
      )}
    >
      {/* Draggable PiP Header */}
      <div
        onMouseDown={handleDragMouseDown}
        onDoubleClick={resetToDefault}
        className="h-8 px-2.5 bg-neutral-900/95 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-300 cursor-grab active:cursor-grabbing shrink-0 rounded-t-2xl"
        title="Drag to reposition (Double-click to reset position)"
      >
        <div className="flex items-center gap-1.5 font-mono pointer-events-none select-none">
          <Move className="w-3 h-3 text-neutral-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-primary font-bold">PiP Viewport</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-300 font-semibold truncate max-w-[130px]">
            {seriesName || `Series #${activeSeriesIndex + 1}`}
          </span>
        </div>

        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={resetToDefault}
            title="Reset position to bottom-right"
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              title="Expand to Full PACS View"
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            title="Minimize PiP to bottom bar"
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close PiP"
              className="p-1 text-neutral-400 hover:text-red-400 rounded hover:bg-neutral-800 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Embedded DICOM Viewport Container */}
      <div className="flex-1 relative bg-black overflow-hidden rounded-b-2xl">
        <ZenDicomViewer
          accessionNumber={accessionNumber}
          modality={modality}
          isLocalCase={isLocalCase}
          localCaseId={localCaseId}
          localSeries={localSeries}
          activeSeriesIndex={activeSeriesIndex}
        />
        {(isDragging || isResizing) && (
          <div className="absolute inset-0 z-50 bg-transparent select-none cursor-inherit" />
        )}
      </div>

      {/* 8-Direction Edge & Corner Resize Handles */}
      <StitchPipResizeHandles
        onResizeStart={handleResizeMouseDown}
        isResizing={isResizing}
      />
    </div>
  );
}
