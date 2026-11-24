'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Grid, Check, Sparkles } from 'lucide-react';
import type { ViewportLayoutMode } from '@/types/viewport';
import { parseLayoutDimensions, formatLayoutMode } from '@/types/viewport';
import { LAYOUT_PRESETS } from './zen-dicom-toolbar-definitions';
import { cn } from '@/lib/utils';

export interface ZenDicomLayoutPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: ViewportLayoutMode;
  onSelectLayout: (layout: ViewportLayoutMode) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function ZenDicomLayoutPopover({
  isOpen,
  onClose,
  currentLayout,
  onSelectLayout,
}: ZenDicomLayoutPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ cols: number; rows: number } | null>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentDim = parseLayoutDimensions(currentLayout);
  const activeCols = hoveredCell?.cols ?? currentDim.cols;
  const activeRows = hoveredCell?.rows ?? currentDim.rows;

  const handleCellClick = (c: number, r: number) => {
    // Exact rows × cols representation (e.g. 2x3, 4x1, 1x4, 3x3)
    const mode = formatLayoutMode(r, c);
    onSelectLayout(mode);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-1.5 z-50 w-48 rounded-xl border border-outline-variant/80 bg-surface-container-high/95 backdrop-blur-md p-2.5 shadow-2xl shadow-black/60 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header Info: Clean "Views" Title & Dimensions-Only Badge */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-outline-variant/60 text-[11px] font-semibold text-foreground">
        <span className="flex items-center gap-1.5 text-primary">
          <Grid className="w-3.5 h-3.5" />
          <span>Views</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/60">
          {hoveredCell
            ? `${hoveredCell.rows} × ${hoveredCell.cols}`
            : `${currentDim.rows} × ${currentDim.cols}`}
        </span>
      </div>

      {/* 4x4 Interactive Hover Matrix - Perfect Square Viewport Previews */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40 mb-2.5"
        onMouseLeave={() => setHoveredCell(null)}
      >
        {Array.from({ length: 4 }).map((_, rIdx) => {
          const rowNum = rIdx + 1;
          return Array.from({ length: 4 }).map((__, cIdx) => {
            const colNum = cIdx + 1;
            const isHighlighted = colNum <= activeCols && rowNum <= activeRows;

            return (
              <button
                key={`${colNum}-${rowNum}`}
                type="button"
                onMouseEnter={() => setHoveredCell({ cols: colNum, rows: rowNum })}
                onClick={() => handleCellClick(colNum, rowNum)}
                className={cn(
                  'w-full aspect-square rounded-xs transition-colors cursor-pointer border',
                  isHighlighted
                    ? 'bg-primary/40 border-primary text-primary-foreground shadow-xs'
                    : 'bg-surface-container border-outline-variant/30 hover:border-outline-variant'
                )}
                title={`${colNum} × ${rowNum}`}
                aria-label={`Select ${colNum} by ${rowNum} viewport layout`}
              />
            );
          });
        })}
      </div>

      {/* Common Fast Preset Buttons */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
          Clinical Presets
        </span>
        <div className="grid grid-cols-2 gap-1 pt-0.5">
          {LAYOUT_PRESETS.map((p) => {
            const isSelected = currentLayout === p.mode;
            return (
              <button
                key={p.mode}
                type="button"
                onClick={() => {
                  onSelectLayout(p.mode);
                  onClose();
                }}
                className={cn(
                  'px-1.5 py-1 rounded-md text-[10px] font-medium flex items-center justify-between transition-colors cursor-pointer border',
                  isSelected
                    ? 'bg-primary/15 border-primary text-primary font-semibold shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-highest border-outline-variant/50 text-foreground'
                )}
                title={p.desc}
              >
                <span className="truncate">{p.label}</span>
                {isSelected && <Check className="w-3 h-3 text-primary shrink-0 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
