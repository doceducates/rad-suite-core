'use client';

import React, { useCallback, useState } from 'react';

interface ZenSplitResizerProps {
  splitPercent?: number;
  onSplitChange: (percent: number) => void;
  onResetSplit: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
}

export function ZenSplitResizer({
  onSplitChange,
  onResetSplit,
  containerRef,
  isDragging,
  setIsDragging,
}: ZenSplitResizerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const onPointerMove = (moveEvt: PointerEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = moveEvt.clientX;
        const relativeX = clientX - rect.left;
        const newPercent = (relativeX / rect.width) * 100;
        onSplitChange(newPercent);
      };

      const onPointerUp = () => {
        setIsDragging(false);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [containerRef, onSplitChange, setIsDragging]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize panes · Double-click to reset 50/50"
      onPointerDown={handlePointerDown}
      onDoubleClick={onResetSplit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-2.5 -mx-1 z-30 cursor-col-resize flex items-center justify-center transition-colors select-none shrink-0 ${
        isDragging
          ? 'bg-primary/40'
          : isHovered
          ? 'bg-primary/20'
          : 'bg-transparent'
      }`}
    >
      {/* Visual Splitter Line */}
      <div
        className={`w-1 h-full transition-colors flex items-center justify-center ${
          isDragging
            ? 'bg-primary'
            : isHovered
            ? 'bg-primary/70'
            : 'bg-outline-variant/40 hover:bg-primary/50'
        }`}
      >
        {/* Grip pill handle in center */}
        <div
          className={`w-1.5 h-8 rounded-full transition-colors flex flex-col items-center justify-center gap-0.5 ${
            isDragging || isHovered ? 'bg-primary shadow-xs' : 'bg-outline-variant'
          }`}
        >
          <span className="w-0.5 h-0.5 rounded-full bg-surface" />
          <span className="w-0.5 h-0.5 rounded-full bg-surface" />
          <span className="w-0.5 h-0.5 rounded-full bg-surface" />
        </div>
      </div>
    </div>
  );
}
