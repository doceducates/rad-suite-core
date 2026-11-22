'use client';

import React from 'react';
import { CornerDownRight } from 'lucide-react';
import { PipResizeHandle } from '@/services/pip-geometry.service';

interface StitchPipResizeHandlesProps {
  onResizeStart: (handle: PipResizeHandle, e: React.MouseEvent) => void;
  isResizing?: boolean;
}

export function StitchPipResizeHandles({ onResizeStart, isResizing }: StitchPipResizeHandlesProps) {
  return (
    <>
      {/* Edge Handles */}
      {/* Top Edge */}
      <div
        onMouseDown={(e) => onResizeStart('n', e)}
        className="absolute top-0 left-3 right-3 h-2 -translate-y-1/2 cursor-ns-resize z-30 group"
        title="Drag vertically to resize height"
      >
        <div className="w-full h-0.5 mx-auto bg-transparent group-hover:bg-primary/50 transition-colors rounded-full" />
      </div>

      {/* Bottom Edge */}
      <div
        onMouseDown={(e) => onResizeStart('s', e)}
        className="absolute bottom-0 left-3 right-3 h-2 translate-y-1/2 cursor-ns-resize z-30 group"
        title="Drag vertically to resize height"
      >
        <div className="w-full h-0.5 mx-auto bg-transparent group-hover:bg-primary/50 transition-colors rounded-full" />
      </div>

      {/* Left Edge */}
      <div
        onMouseDown={(e) => onResizeStart('w', e)}
        className="absolute left-0 top-3 bottom-3 w-2 -translate-x-1/2 cursor-ew-resize z-30 group"
        title="Drag horizontally to resize width"
      >
        <div className="h-full w-0.5 my-auto bg-transparent group-hover:bg-primary/50 transition-colors rounded-full" />
      </div>

      {/* Right Edge */}
      <div
        onMouseDown={(e) => onResizeStart('e', e)}
        className="absolute right-0 top-3 bottom-3 w-2 translate-x-1/2 cursor-ew-resize z-30 group"
        title="Drag horizontally to resize width"
      >
        <div className="h-full w-0.5 my-auto bg-transparent group-hover:bg-primary/50 transition-colors rounded-full" />
      </div>

      {/* Corner Handles */}
      {/* Top-Left Corner */}
      <div
        onMouseDown={(e) => onResizeStart('nw', e)}
        className="absolute -top-1.5 -left-1.5 w-4 h-4 cursor-nwse-resize z-40 rounded-tl hover:bg-primary/30 transition-colors"
        title="Drag corner to resize"
      />

      {/* Top-Right Corner */}
      <div
        onMouseDown={(e) => onResizeStart('ne', e)}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 cursor-nesw-resize z-40 rounded-tr hover:bg-primary/30 transition-colors"
        title="Drag corner to resize"
      />

      {/* Bottom-Left Corner */}
      <div
        onMouseDown={(e) => onResizeStart('sw', e)}
        className="absolute -bottom-1.5 -left-1.5 w-4 h-4 cursor-nesw-resize z-40 rounded-bl hover:bg-primary/30 transition-colors"
        title="Drag corner to resize"
      />

      {/* Bottom-Right Corner (with visual grip indicator) */}
      <div
        onMouseDown={(e) => onResizeStart('se', e)}
        className="absolute -bottom-1 -right-1 w-5 h-5 cursor-nwse-resize z-40 flex items-center justify-center text-neutral-500 hover:text-primary transition-colors"
        title="Drag corner to resize"
      >
        <CornerDownRight className="w-3.5 h-3.5" />
      </div>
    </>
  );
}
