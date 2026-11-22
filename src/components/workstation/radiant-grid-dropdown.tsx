'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RadiantGridPopover } from './radiant-grid-popover';

interface RadiantGridDropdownProps {
  rows: number;
  cols: number;
  onSelectGrid: (rows: number, cols: number) => void;
  align?: 'left' | 'right';
  className?: string;
}

export function RadiantGridDropdown({
  rows,
  cols,
  onSelectGrid,
  align = 'left',
  className = '',
}: RadiantGridDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate fixed viewport coordinates when opening
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePos = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 224; // w-56
      let left = align === 'right' ? rect.right - popoverWidth : rect.left;

      if (typeof window !== 'undefined') {
        if (left + popoverWidth > window.innerWidth - 8) {
          left = window.innerWidth - popoverWidth - 8;
        }
        if (left < 8) left = 8;
      }

      setPos({ top: rect.bottom + 6, left });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isOpen, align]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setHoverRows(0);
        setHoverCols(0);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setHoverRows(0);
        setHoverCols(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (r: number, c: number) => {
    onSelectGrid(r, c);
    setIsOpen(false);
    setHoverRows(0);
    setHoverCols(0);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-8 px-2 rounded-lg border font-mono text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
          isOpen || rows > 1 || cols > 1
            ? 'bg-primary/20 text-primary border-primary/50'
            : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border-outline-variant/40'
        }`}
        title="Multi-Pane Viewport Grid (RadiAnt 5×5 Matrix)"
      >
        <span className="material-symbols-outlined text-[16px]">grid_view</span>
        <span>{rows}×{cols}</span>
        <span className="material-symbols-outlined text-[14px] opacity-70">
          {isOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
        </span>
      </button>

      {isOpen && mounted && (
        <RadiantGridPopover
          rows={rows}
          cols={cols}
          hoverRows={hoverRows}
          hoverCols={hoverCols}
          setHoverRows={setHoverRows}
          setHoverCols={setHoverCols}
          onSelectGrid={handleSelect}
          pos={pos}
          popoverRef={popoverRef}
        />
      )}
    </div>
  );
}
