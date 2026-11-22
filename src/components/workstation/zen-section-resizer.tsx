'use client';

import React, { useRef, useCallback } from 'react';

interface ZenSectionResizerProps {
  onDelta: (deltaY: number) => void;
  onReset?: () => void;
  title?: string;
}

export function ZenSectionResizer({ onDelta, onReset, title = 'Drag to resize section height (Double-click to reset)' }: ZenSectionResizerProps) {
  const startYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dy = moveEvt.clientY - startYRef.current;
      startYRef.current = moveEvt.clientY;
      onDelta(dy);
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(upEvt.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [onDelta]);

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={onReset}
      title={title}
      className="h-2.5 -my-1 w-full flex items-center justify-center cursor-row-resize select-none group z-10 shrink-0 touch-none"
    >
      <div className="w-full h-px bg-outline-variant/30 group-hover:bg-primary/70 group-hover:h-0.5 transition-all relative flex items-center justify-center">
        <div className="w-8 h-1 rounded-full bg-outline-variant/60 group-hover:bg-primary transition-colors" />
      </div>
    </div>
  );
}
