'use client';

import React from 'react';
import type { AnatomyAnnotationPoint } from '@/types';

interface ZenAnatomyPinOverlayProps {
  visible: boolean;
  points: AnatomyAnnotationPoint[];
  language?: 'en' | 'la';
  hoveredPointId?: number | null;
  onHoverPoint?: (pt: AnatomyAnnotationPoint | null) => void;
}

export function ZenAnatomyPinOverlay({
  visible,
  points,
  language = 'en',
  hoveredPointId,
  onHoverPoint,
}: ZenAnatomyPinOverlayProps) {
  if (!visible || !points.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {points.map((pt) => {
        const isHovered = hoveredPointId === pt.point_id;
        const label = language === 'la' && pt.name_la ? pt.name_la : pt.name_en;

        return (
          <div
            key={pt.point_id}
            style={{
              left: `${pt.x_norm * 100}%`,
              top: `${pt.y_norm * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseEnter={() => onHoverPoint?.(pt)}
            onMouseLeave={() => onHoverPoint?.(null)}
            className="pointer-events-auto absolute flex items-center justify-center cursor-pointer transition-transform duration-100 hover:scale-125"
          >
            {/* Circular Pin Marker */}
            <span
              style={{ backgroundColor: pt.color || '#00e5ff' }}
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-md ring-1 ring-black/60 ${
                isHovered ? 'ring-2 ring-white scale-125' : ''
              }`}
            >
              {pt.point_id % 100}
            </span>

            {/* Hover Tooltip Card */}
            {isHovered && (
              <div
                style={{
                  left: '100%',
                  top: '-50%',
                  transform: 'translate(8px, -50%)',
                }}
                className="pointer-events-none absolute whitespace-nowrap rounded-lg border border-border/80 bg-background/95 px-2.5 py-1 text-xs shadow-xl backdrop-blur-md"
              >
                <div className="font-semibold text-foreground text-[11px] leading-tight">{label}</div>
                {language !== 'la' && pt.name_la && (
                  <div className="font-serif italic text-muted-foreground text-[10px] leading-tight">
                    {pt.name_la}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
