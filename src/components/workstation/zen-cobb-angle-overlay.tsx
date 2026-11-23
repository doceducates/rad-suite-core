'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface DicomCobbAngleMeasurement {
  id: string;
  line1: { p1: { x: number; y: number }; p2: { x: number; y: number } };
  line2: { p1: { x: number; y: number }; p2: { x: number; y: number } };
  cobbDeg: number;
}

interface ZenCobbAngleOverlayProps {
  isActive: boolean;
  measurements: DicomCobbAngleMeasurement[];
  onAddMeasurement: (m: DicomCobbAngleMeasurement) => void;
  onDeleteMeasurement?: (id: string) => void;
  onClearMeasurements?: () => void;
}

export function calculateCobbAngleDeg(
  l1p1: { x: number; y: number },
  l1p2: { x: number; y: number },
  l2p1: { x: number; y: number },
  l2p2: { x: number; y: number }
): number {
  const dx1 = l1p2.x - l1p1.x;
  const dy1 = l1p2.y - l1p1.y;
  const dx2 = l2p2.x - l2p1.x;
  const dy2 = l2p2.y - l2p1.y;

  const mag1 = Math.hypot(dx1, dy1);
  const mag2 = Math.hypot(dx2, dy2);
  if (mag1 < 1e-6 || mag2 < 1e-6) return 0;

  const dot = dx1 * dx2 + dy1 * dy2;
  const cos = Math.max(-1, Math.min(1, Math.abs(dot) / (mag1 * mag2)));
  return Number(((Math.acos(cos) * 180) / Math.PI).toFixed(1));
}

export function getCobbSeverity(deg: number): string {
  if (deg < 10) return 'Normal';
  if (deg < 25) return 'Mild';
  if (deg < 40) return 'Moderate';
  return 'Severe';
}

export function ZenCobbAngleOverlay({
  isActive,
  measurements,
  onAddMeasurement,
  onDeleteMeasurement,
  onClearMeasurements,
}: ZenCobbAngleOverlayProps) {
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

    if (points.length < 3) {
      setPoints((prev) => [...prev, coords]);
    } else if (points.length === 3) {
      const l1 = { p1: points[0], p2: points[1] };
      const l2 = { p1: points[2], p2: coords };
      const cobbDeg = calculateCobbAngleDeg(l1.p1, l1.p2, l2.p1, l2.p2);
      if (cobbDeg > 0) {
        onAddMeasurement({
          id: `cobb-${Date.now()}`,
          line1: l1,
          line2: l2,
          cobbDeg,
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
        {/* Existing Saved Cobb Angle Measurements */}
        {measurements.map((m) => {
          const midX = (m.line1.p1.x + m.line2.p2.x) / 2;
          const midY = (m.line1.p1.y + m.line2.p2.y) / 2;
          const sev = getCobbSeverity(m.cobbDeg);
          return (
            <g
              key={m.id}
              className="select-none cursor-pointer"
              onContextMenu={(e) => {
                if (onDeleteMeasurement) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteMeasurement(m.id);
                }
              }}
            >
              {/* Line 1 (Superior Endplate - UEV) */}
              <line
                x1={m.line1.p1.x} y1={m.line1.p1.y} x2={m.line1.p2.x} y2={m.line1.p2.y}
                stroke="#ffe066" strokeWidth="2.5" strokeDasharray="3 3"
              />
              {/* Line 2 (Inferior Endplate - LEV) */}
              <line
                x1={m.line2.p1.x} y1={m.line2.p1.y} x2={m.line2.p2.x} y2={m.line2.p2.y}
                stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3"
              />
              {/* Cobb Angle Label Badge */}
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  x="-52" y="-12" width="104" height="24"
                  rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.2" opacity="0.95"
                />
                <text
                  x="-8" y="4" textAnchor="middle" fill="#ffe066"
                  fontSize="11" fontWeight="bold" fontFamily="JetBrains Mono, monospace"
                >
                  {m.cobbDeg}° ({sev})
                </text>
                {onDeleteMeasurement && (
                  <g
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMeasurement(m.id);
                    }}
                  >
                    <circle cx="40" cy="0" r="7" fill="#dc2626" opacity="0.9" />
                    <text x="40" y="3.5" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">×</text>
                  </g>
                )}
              </g>
            </g>
          );
        })}

        {/* In-progress drawing lines */}
        {points.length === 1 && hoverPoint && (
          <line
            x1={points[0].x} y1={points[0].y} x2={hoverPoint.x} y2={hoverPoint.y}
            stroke="#ffe066" strokeWidth="2" strokeDasharray="4 4"
          />
        )}
        {points.length === 2 && (
          <line
            x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y}
            stroke="#ffe066" strokeWidth="2"
          />
        )}
        {points.length === 3 && hoverPoint && (
          <>
            <line
              x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y}
              stroke="#ffe066" strokeWidth="2"
            />
            <line
              x1={points[2].x} y1={points[2].y} x2={hoverPoint.x} y2={hoverPoint.y}
              stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4"
            />
            <text
              x={hoverPoint.x + 10} y={hoverPoint.y - 10} fill="#f59e0b"
              fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold"
            >
              Cobb: {calculateCobbAngleDeg(points[0], points[1], points[2], hoverPoint)}°
            </text>
          </>
        )}
      </svg>

      {measurements.length > 0 && isActive && onClearMeasurements && (
        <button
          type="button"
          onClick={onClearMeasurements}
          className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto px-2.5 py-1 rounded-md bg-surface-container-highest/95 hover:bg-error hover:text-white border border-outline-variant/60 font-mono text-[10px] text-on-surface shadow-md transition-colors cursor-pointer"
        >
          Clear Cobb Angles ({measurements.length})
        </button>
      )}
    </div>
  );
}
