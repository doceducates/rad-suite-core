'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ZenColumnDividerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  isDragging?: boolean;
  className?: string;
  title?: string;
}

export function ZenColumnDivider({
  onMouseDown,
  onDoubleClick,
  isDragging = false,
  className,
  title = 'Drag to resize column · Double-click to reset',
}: ZenColumnDividerProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title={title}
      className={cn(
        'group relative w-1.5 hover:w-2 -mx-0.5 z-20 cursor-col-resize select-none shrink-0 flex items-center justify-center transition-all duration-150',
        isDragging && 'w-2 bg-primary/40',
        className
      )}
    >
      {/* Background line */}
      <div
        className={cn(
          'w-[1px] h-full bg-outline-variant/40 group-hover:bg-primary/70 transition-colors',
          isDragging && 'bg-primary w-[2px]'
        )}
      />

      {/* Tiny grab handle pill */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-outline-variant/60 group-hover:bg-primary group-hover:h-10 transition-all opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center gap-0.5 pointer-events-none',
          isDragging && 'opacity-100 bg-primary h-12'
        )}
      />
    </div>
  );
}
