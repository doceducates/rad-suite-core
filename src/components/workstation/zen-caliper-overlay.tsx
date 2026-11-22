'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface DicomMeasurement {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lengthMm: number;
}

interface ZenCaliperOverlayProps {
  isActive: boolean;
  pixelSpacing?: [number, number];
  containerWidth?: number;
  containerHeight?: number;
  measurements: DicomMeasurement[];
  onAddMeasurement: (m: DicomMeasurement) => void;
  onDeleteMeasurement?: (id: string) => void;
  onClearMeasurements: () => void;
}

export function ZenCaliperOverlay({
  isActive,
  pixelSpacing = [0.7, 0.7],
  measurements,
  onAddMeasurement,
  onDeleteMeasurement,
  onClearMeasurements,
}: ZenCaliperOverlayProps) {
  const [currentLine, setCurrentLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const isDrawing = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Keyboard shortcut: Delete or Backspace removes the most recent measurement
  useEffect(() => {
    if (!isActive || !onDeleteMeasurement) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && measurements.length > 0) {
        onDeleteMeasurement(measurements[measurements.length - 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, measurements, onDeleteMeasurement]);

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
    const { x, y } = getLocalCoords(e);
    isDrawing.current = true;
    setCurrentLine({ x1: x, y1: y, x2: x, y2: y });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing.current || !currentLine) return;
    const { x, y } = getLocalCoords(e);
    setCurrentLine((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing.current || !currentLine) return;
    isDrawing.current = false;
    const dx = currentLine.x2 - currentLine.x1;
    const dy = currentLine.y2 - currentLine.y1;
    const distPx = Math.hypot(dx, dy);

    if (distPx > 8) {
      const spacing = pixelSpacing[0] || 0.7;
      const lengthMm = Number((distPx * spacing).toFixed(1));
      onAddMeasurement({
        id: `caliper-${Date.now()}`,
        x1: currentLine.x1,
        y1: currentLine.y1,
        x2: currentLine.x2,
        y2: currentLine.y2,
        lengthMm,
      });
    }
    setCurrentLine(null);
  };

  const linesToRender = [...measurements];
  if (currentLine) {
    const dx = currentLine.x2 - currentLine.x1;
    const dy = currentLine.y2 - currentLine.y1;
    const distPx = Math.hypot(dx, dy);
    const spacing = pixelSpacing[0] || 0.7;
    linesToRender.push({
      id: 'active',
      ...currentLine,
      lengthMm: Number((distPx * spacing).toFixed(1)),
    });
  }

  return (
    <div className={`absolute inset-0 z-15 ${isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {linesToRender.map((m) => {
          const midX = (m.x1 + m.x2) / 2;
          const midY = (m.y1 + m.y2) / 2;
          const isTemp = m.id === 'active';

          return (
            <g
              key={m.id}
              className={!isTemp ? 'cursor-pointer' : undefined}
              onContextMenu={(e) => {
                if (!isTemp && onDeleteMeasurement) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteMeasurement(m.id);
                }
              }}
            >
              <line
                x1={m.x1}
                y1={m.y1}
                x2={m.x2}
                y2={m.y2}
                stroke="#8ecf9e"
                strokeWidth="2"
                strokeDasharray={isTemp ? '4 2' : 'none'}
                filter="drop-shadow(0 0 4px rgba(74, 124, 89, 0.8))"
              />
              <circle cx={m.x1} cy={m.y1} r="3.5" fill="#8ecf9e" />
              <circle cx={m.x2} cy={m.y2} r="3.5" fill="#8ecf9e" />

              {/* Distance Pill Badge with Delete 'x' Button */}
              <g transform={`translate(${midX}, ${midY - 16})`}>
                <rect
                  x="-42"
                  y="-11"
                  width={isTemp ? '62' : '82'}
                  height="22"
                  rx="6"
                  fill="#14171a"
                  stroke="#8ecf9e"
                  strokeWidth="1"
                  opacity="0.95"
                />
                <text
                  x={isTemp ? '-11' : '-9'}
                  y="4"
                  fill="#8ecf9e"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {m.lengthMm} mm
                </text>

                {!isTemp && onDeleteMeasurement && (
                  <g
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMeasurement(m.id);
                    }}
                  >
                    <circle cx="28" cy="0" r="7" fill="#dc2626" opacity="0.9" />
                    <text x="28" y="3.5" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                      ×
                    </text>
                  </g>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {/* Clear Calipers button */}
      {measurements.length > 0 && isActive && (
        <button
          type="button"
          onClick={onClearMeasurements}
          className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto px-2.5 py-1 rounded-md bg-surface-container-highest/95 hover:bg-error hover:text-white border border-outline-variant/60 font-mono text-[10px] text-on-surface shadow-md transition-colors cursor-pointer"
        >
          Clear All ({measurements.length})
        </button>
      )}
    </div>
  );
}
