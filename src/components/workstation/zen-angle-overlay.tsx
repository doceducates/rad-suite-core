'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface DicomAngleMeasurement {
  id: string;
  p1: { x: number; y: number };
  vertex: { x: number; y: number };
  p2: { x: number; y: number };
  angleDeg: number;
}

interface ZenAngleOverlayProps {
  isActive: boolean;
  measurements: DicomAngleMeasurement[];
  onAddMeasurement: (m: DicomAngleMeasurement) => void;
  onDeleteMeasurement?: (id: string) => void;
  onClearMeasurements: () => void;
}

function calculateAngleDeg(
  p1: { x: number; y: number },
  v: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1 = { x: p1.x - v.x, y: p1.y - v.y };
  const v2 = { x: p2.x - v.x, y: p2.y - v.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Number(((Math.acos(cos) * 180) / Math.PI).toFixed(1));
}

export function ZenAngleOverlay({
  isActive,
  measurements,
  onAddMeasurement,
  onDeleteMeasurement,
  onClearMeasurements,
}: ZenAngleOverlayProps) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && points.length > 0) {
        e.preventDefault();
        setPoints([]);
        setHoverPoint(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && measurements.length > 0) {
        onDeleteMeasurement?.(measurements[measurements.length - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, measurements, onDeleteMeasurement, points.length]);

  const getLocalCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const local = pt.matrixTransform(ctm.inverse());
        return { x: local.x, y: local.y };
      }
    }
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isActive || e.button !== 0) return;
    const coords = getLocalCoords(e);

    if (points.length === 0) {
      setPoints([coords]);
    } else if (points.length === 1) {
      // Second click sets vertex
      setPoints([points[0], coords]);
    } else if (points.length === 2) {
      // Third click completes the 3-point angle
      const p1 = points[0];
      const vertex = points[1];
      const p2 = coords;
      const angleDeg = calculateAngleDeg(p1, vertex, p2);
      if (angleDeg > 0) {
        onAddMeasurement({
          id: `angle-${Date.now()}`,
          p1,
          vertex,
          p2,
          angleDeg,
        });
      }
      setPoints([]);
      setHoverPoint(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isActive || points.length === 0) return;
    setHoverPoint(getLocalCoords(e));
  };

  return (
    <div className={`absolute inset-0 z-15 ${isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Render Completed Measurements */}
        {measurements.map((m) => {
          const midX = m.vertex.x;
          const midY = m.vertex.y - 18;
          return (
            <g
              key={m.id}
              className="cursor-pointer"
              onContextMenu={(e) => {
                if (onDeleteMeasurement) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteMeasurement(m.id);
                }
              }}
            >
              <line x1={m.vertex.x} y1={m.vertex.y} x2={m.p1.x} y2={m.p1.y} stroke="#8ecf9e" strokeWidth="2" filter="drop-shadow(0 0 4px rgba(142, 207, 158, 0.8))" />
              <line x1={m.vertex.x} y1={m.vertex.y} x2={m.p2.x} y2={m.p2.y} stroke="#8ecf9e" strokeWidth="2" filter="drop-shadow(0 0 4px rgba(142, 207, 158, 0.8))" />
              <circle cx={m.vertex.x} cy={m.vertex.y} r="4" fill="#8ecf9e" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx={m.p1.x} cy={m.p1.y} r="3" fill="#8ecf9e" />
              <circle cx={m.p2.x} cy={m.p2.y} r="3" fill="#8ecf9e" />

              {/* Angle Readout Badge */}
              <g transform={`translate(${midX}, ${midY})`}>
                <rect x="-44" y="-11" width="88" height="22" rx="6" fill="#0f172a" stroke="#8ecf9e" strokeWidth="1" opacity="0.95" />
                <text x="-8" y="4" fill="#8ecf9e" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">
                  {m.angleDeg}°
                </text>
                {onDeleteMeasurement && (
                  <g
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMeasurement(m.id);
                    }}
                  >
                    <circle cx="30" cy="0" r="7" fill="#dc2626" opacity="0.9" />
                    <text x="30" y="3.5" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">×</text>
                  </g>
                )}
              </g>
            </g>
          );
        })}

        {/* Render In-Progress Angle */}
        {points.length === 1 && hoverPoint && (
          <line x1={points[0].x} y1={points[0].y} x2={hoverPoint.x} y2={hoverPoint.y} stroke="#8ecf9e" strokeWidth="1.5" strokeDasharray="4 2" />
        )}
        {points.length === 2 && hoverPoint && (
          <g>
            <line x1={points[1].x} y1={points[1].y} x2={points[0].x} y2={points[0].y} stroke="#8ecf9e" strokeWidth="2" />
            <line x1={points[1].x} y1={points[1].y} x2={hoverPoint.x} y2={hoverPoint.y} stroke="#8ecf9e" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx={points[1].x} cy={points[1].y} r="4" fill="#8ecf9e" />
            <circle cx={points[0].x} cy={points[0].y} r="3" fill="#8ecf9e" />
            <text x={points[1].x + 10} y={points[1].y - 10} fill="#8ecf9e" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
              {calculateAngleDeg(points[0], points[1], hoverPoint)}°
            </text>
          </g>
        )}
      </svg>

      {measurements.length > 0 && isActive && (
        <button
          type="button"
          onClick={onClearMeasurements}
          className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto px-2.5 py-1 rounded-md bg-surface-container-highest/95 hover:bg-error hover:text-white border border-outline-variant/60 font-mono text-[10px] text-on-surface shadow-md transition-colors cursor-pointer"
        >
          Clear Angles ({measurements.length})
        </button>
      )}
    </div>
  );
}
