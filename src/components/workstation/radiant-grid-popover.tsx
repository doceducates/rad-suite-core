'use client';

import React from 'react';
import { createPortal } from 'react-dom';

const PRESETS: [number, number, string][] = [
  [1, 1, '1×1'],
  [1, 2, '1×2'],
  [2, 1, '2×1'],
  [2, 2, '2×2'],
  [2, 3, '2×3'],
  [3, 3, '3×3'],
];

interface RadiantGridPopoverProps {
  rows: number;
  cols: number;
  hoverRows: number;
  hoverCols: number;
  setHoverRows: (r: number) => void;
  setHoverCols: (c: number) => void;
  onSelectGrid: (rows: number, cols: number) => void;
  pos: { top: number; left: number };
  popoverRef: React.RefObject<HTMLDivElement | null>;
}

export function RadiantGridPopover({
  rows,
  cols,
  hoverRows,
  hoverCols,
  setHoverRows,
  setHoverCols,
  onSelectGrid,
  pos,
  popoverRef,
}: RadiantGridPopoverProps) {
  if (typeof document === 'undefined') return null;

  const activeR = hoverRows || rows;
  const activeC = hoverCols || cols;

  return createPortal(
    <div
      ref={popoverRef}
      style={{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px` }}
      className="z-[99999] p-3 rounded-xl bg-[#1a1d24] border border-outline-variant/70 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl select-none w-56 animate-in fade-in zoom-in-95 duration-100 text-on-surface"
    >
      {/* Header readout */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/30 font-mono text-[11px]">
        <span className="text-on-surface-variant font-medium">Layout:</span>
        <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
          {activeR} × {activeC} ({activeR * activeC} panes)
        </span>
      </div>

      {/* 5×5 Interactive Matrix */}
      <div
        className="grid grid-cols-5 gap-1.5 p-1 bg-[#121418] rounded-lg border border-outline-variant/30"
        onMouseLeave={() => {
          setHoverRows(0);
          setHoverCols(0);
        }}
      >
        {Array.from({ length: 5 }, (_, rIdx) => {
          const r = rIdx + 1;
          return Array.from({ length: 5 }, (_, cIdx) => {
            const c = cIdx + 1;
            const isHovered = hoverRows > 0 && hoverCols > 0 && r <= hoverRows && c <= hoverCols;
            const isSelected = !hoverRows && r <= rows && c <= cols;

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onMouseEnter={() => {
                  setHoverRows(r);
                  setHoverCols(c);
                }}
                onClick={() => onSelectGrid(r, c)}
                className={`w-7 h-7 rounded border transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-primary border-primary shadow-[0_0_8px_rgba(74,124,89,0.6)] scale-105 z-10'
                    : isSelected
                    ? 'bg-primary/45 border-primary/70'
                    : 'bg-[#252932] border-[#313642] hover:border-primary/40'
                }`}
                title={`${r} × ${c} Grid (${r * c} panes)`}
              />
            );
          });
        })}
      </div>

      {/* Quick Presets row */}
      <div className="pt-2.5 mt-2 border-t border-outline-variant/30 flex flex-wrap items-center gap-1">
        {PRESETS.map(([prR, prC, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelectGrid(prR, prC)}
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border transition-colors cursor-pointer ${
              rows === prR && cols === prC
                ? 'bg-primary text-white border-primary'
                : 'bg-[#252932] text-on-surface-variant hover:text-white hover:bg-primary/30 border-outline-variant/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}
