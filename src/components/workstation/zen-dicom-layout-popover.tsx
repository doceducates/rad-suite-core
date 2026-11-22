'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Grid, Check, Sparkles } from 'lucide-react';
import type { ViewportLayoutMode } from '@/types/viewport';
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

  const activeCols = hoveredCell?.cols ?? (currentLayout === '1x1' ? 1 : currentLayout === '1x2' ? 2 : currentLayout === '1x3' ? 3 : currentLayout === '2x2' ? 2 : currentLayout === '3x3' ? 3 : 4);
  const activeRows = hoveredCell?.rows ?? (currentLayout === '1x1' ? 1 : currentLayout === '1x2' ? 1 : currentLayout === '1x3' ? 1 : currentLayout === '2x2' ? 2 : currentLayout === '3x3' ? 3 : 4);

  const handleCellClick = (c: number, r: number) => {
    let mode: ViewportLayoutMode = '1x1';
    if (c === 1 && r === 1) mode = '1x1';
    else if ((c === 2 && r === 1) || (c === 1 && r === 2)) mode = '1x2';
    else if (c === 3 && r === 1) mode = '1x3';
    else if (c <= 2 && r <= 2) mode = '2x2';
    else if (c <= 3 && r <= 3) mode = '3x3';
    else mode = '4x4';

    onSelectLayout(mode);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-1.5 z-50 w-56 rounded-xl border border-outline-variant/80 bg-surface-container-high/95 backdrop-blur-md p-3 shadow-2xl shadow-black/60 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/60 text-[11px] font-semibold text-foreground">
        <span className="flex items-center gap-1.5 text-primary">
          <Grid className="w-3.5 h-3.5" />
          <span>Graph of Views</span>
        </span>
        <span className="text-[10px] font-mono text-muted-foreground bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/60">
          {hoveredCell ? `${hoveredCell.cols} × ${hoveredCell.rows}` : currentLayout}
        </span>
      </div>

      {/* 4x4 Interactive Hover Matrix */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/40 mb-3"
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
                  'h-6 rounded-xs transition-colors cursor-pointer border',
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
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Clinical Presets
        </span>
        <div className="grid grid-cols-2 gap-1 pt-0.5">
          {LAYOUT_PRESETS.slice(0, 4).map((p) => {
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
                  'px-2 py-1 rounded-md text-[11px] font-medium flex items-center justify-between transition-colors cursor-pointer border',
                  isSelected
                    ? 'bg-primary/15 border-primary text-primary font-semibold shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-highest border-outline-variant/50 text-foreground'
                )}
                title={p.desc}
              >
                <span>{p.label}</span>
                {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
