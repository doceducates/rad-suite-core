'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface DicomRoiMeasurement {
  id: string;
  type: 'ellipse' | 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  areaMm2: number;
}

interface ZenRoiOverlayProps {
  isActive: boolean;
  roiType?: 'ellipse' | 'rectangle';
  pixelSpacing?: [number, number];
  measurements: DicomRoiMeasurement[];
  onAddMeasurement: (m: DicomRoiMeasurement) => void;
  onDeleteMeasurement?: (id: string) => void;
  onClearMeasurements?: () => void;
}

export function ZenRoiOverlay({
  isActive,
  roiType = 'ellipse',
  pixelSpacing = [0.7, 0.7],
  measurements,
  onAddMeasurement,
  onDeleteMeasurement,
}: ZenRoiOverlayProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
    const coords = getLocalCoords(e);
    setStartPoint(coords);
    setCurrentBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!startPoint) return;
    const coords = getLocalCoords(e);
    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const w = Math.abs(coords.x - startPoint.x);
    const h = Math.abs(coords.y - startPoint.y);
    setCurrentBox({ x, y, w, h });
  };

  const handlePointerUp = () => {
    if (!startPoint || !currentBox) return;
    if (currentBox.w > 6 && currentBox.h > 6) {
      const spX = pixelSpacing[0] || 0.7;
      const spY = pixelSpacing[1] || 0.7;
      const areaMm2 =
        roiType === 'ellipse'
          ? Math.PI * (currentBox.w * spX * 0.5) * (currentBox.h * spY * 0.5)
          : currentBox.w * spX * currentBox.h * spY;

      onAddMeasurement({
        id: `roi-${Date.now()}`,
        type: roiType,
        x: currentBox.x,
        y: currentBox.y,
        width: currentBox.w,
        height: currentBox.h,
        areaMm2: Number(areaMm2.toFixed(1)),
      });
    }
    setStartPoint(null);
    setCurrentBox(null);
  };

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 w-full h-full ${
        isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Saved ROIs */}
      {measurements.map((roi) => (
        <g key={roi.id} className="select-none">
          {roi.type === 'ellipse' ? (
            <ellipse
              cx={roi.x + roi.width / 2}
              cy={roi.y + roi.height / 2}
              rx={roi.width / 2}
              ry={roi.height / 2}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
          ) : (
            <rect
              x={roi.x}
              y={roi.y}
              width={roi.width}
              height={roi.height}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
          )}
          <rect
            x={roi.x + roi.width / 2 - 38}
            y={roi.y - 18}
            width={76}
            height={16}
            rx="3"
            fill="rgba(0,0,0,0.85)"
            stroke="#38bdf8"
            strokeWidth="0.8"
          />
          <text
            x={roi.x + roi.width / 2}
            y={roi.y - 6}
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {roi.areaMm2} mm²
          </text>
        </g>
      ))}

      {/* Active in-progress ROI */}
      {currentBox && currentBox.w > 0 && currentBox.h > 0 && (
        roiType === 'ellipse' ? (
          <ellipse
            cx={currentBox.x + currentBox.w / 2}
            cy={currentBox.y + currentBox.h / 2}
            rx={currentBox.w / 2}
            ry={currentBox.h / 2}
            fill="rgba(56, 189, 248, 0.15)"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        ) : (
          <rect
            x={currentBox.x}
            y={currentBox.y}
            width={currentBox.w}
            height={currentBox.h}
            fill="rgba(56, 189, 248, 0.15)"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )
      )}
    </svg>
  );
}
