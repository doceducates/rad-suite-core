'use client';

import React, { useMemo } from 'react';
import { SliceGeometry } from '@/services/dicom-geometry.service';
import { project3DPointToPixel } from '@/services/dicom-3d-point.service';

interface Zen3DCrosshairProps {
  point3D: [number, number, number] | null;
  geometry?: SliceGeometry;
  active?: boolean;
  onClear?: () => void;
}

export function Zen3DCrosshair({ point3D, geometry, active = true, onClear }: Zen3DCrosshairProps) {
  const projection = useMemo(() => {
    if (!point3D || !geometry || !active) return null;
    return project3DPointToPixel(point3D, geometry);
  }, [point3D, geometry, active]);

  if (!projection || !projection.inBounds) return null;

  // Fade out if current slice is more than 8mm away from the 3D point plane
  const absDist = Math.abs(projection.distMm);
  if (absDist > 12) return null;
  const opacity = absDist > 4 ? Math.max(0.2, 1 - (absDist - 4) / 8) : 0.9;

  const { pctX, pctY } = projection;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-15" style={{ opacity }}>
      <svg className="w-full h-full" preserveAspectRatio="none">
        {/* Left Segment */}
        <line
          x1="0"
          y1={`${pctY}%`}
          x2={`${Math.max(0, pctX - 2.5)}%`}
          y2={`${pctY}%`}
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        {/* Right Segment */}
        <line
          x1={`${Math.min(100, pctX + 2.5)}%`}
          y1={`${pctY}%`}
          x2="100%"
          y2={`${pctY}%`}
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        {/* Top Segment */}
        <line
          x1={`${pctX}%`}
          y1="0"
          x2={`${pctX}%`}
          y2={`${Math.max(0, pctY - 2.5)}%`}
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        {/* Bottom Segment */}
        <line
          x1={`${pctX}%`}
          y1={`${Math.min(100, pctY + 2.5)}%`}
          x2={`${pctX}%`}
          y2="100%"
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        {/* Target Reticle Aperture */}
        <circle
          cx={`${pctX}%`}
          cy={`${pctY}%`}
          r="7"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          className="animate-pulse"
        />
        <circle cx={`${pctX}%`} cy={`${pctY}%`} r="1.5" fill="#f59e0b" />
      </svg>

      {/* Coordinate Label with Dismiss Button */}
      <div
        className="absolute px-1.5 py-0.5 rounded bg-amber-950/85 border border-amber-500/60 text-[9px] font-mono text-amber-300 backdrop-blur-xs whitespace-nowrap shadow-lg flex items-center gap-1.5 pointer-events-auto"
        style={{
          left: `${Math.min(84, Math.max(2, pctX + 1.5))}%`,
          top: `${Math.min(88, Math.max(2, pctY + 1.5))}%`,
        }}
      >
        <span>
          3D: {point3D![0].toFixed(1)}, {point3D![1].toFixed(1)}, {point3D![2].toFixed(1)} mm
          {absDist > 0.5 ? ` (Δ ${absDist.toFixed(1)}mm)` : ''}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-amber-400/20 text-amber-300 hover:text-white transition-colors cursor-pointer text-[10px]"
            title="Dismiss 3D Crosshair (Esc)"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
