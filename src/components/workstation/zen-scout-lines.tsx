'use client';

import React from 'react';
import { ProjectedScoutLine } from '@/services/dicom-geometry.service';

interface ZenScoutLinesProps {
  lines: ProjectedScoutLine[];
  onSelectScoutSlice?: (seriesNumber: string | number, sliceIndex: number) => void;
}

export function ZenScoutLines({ lines, onSelectScoutSlice }: ZenScoutLinesProps) {
  if (!lines || lines.length === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible select-none">
      <defs>
        <filter id="scout-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.9" />
        </filter>
      </defs>

      {lines.map((line, lineIdx) => {
        // Label position slightly above the left end of the line
        const labelX = Math.min(line.x1, line.x2) + 2;
        const labelY = Math.min(line.y1, line.y2) - 1.5;

        return (
          <g
            key={`${line.id}-${lineIdx}`}
            className="group pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectScoutSlice?.(line.sourceSeriesNumber, line.sourceSliceIndex);
            }}
          >
            {/* Outer dark casing for maximum contrast on bright bone & white scans */}
            <line
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke="#000000"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Inner RadiAnt-style bright diagnostic yellow reference line */}
            <line
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke="#facc15"
              strokeWidth="1.75"
              strokeLinecap="round"
              filter="url(#scout-glow)"
              className="transition-all group-hover:stroke-amber-300"
            />

            {/* End Point Markers */}
            <circle cx={`${line.x1}%`} cy={`${line.y1}%`} r="2.5" fill="#facc15" stroke="#000" strokeWidth="1" />
            <circle cx={`${line.x2}%`} cy={`${line.y2}%`} r="2.5" fill="#facc15" stroke="#000" strokeWidth="1" />

            {/* Scout Slice Pill Label */}
            <g
              transform={`translate(${labelX}, ${labelY})`}
              onClick={() => onSelectScoutSlice?.(line.sourceSeriesNumber, line.sourceSliceIndex)}
            >
              <rect
                x="0"
                y="-12"
                width="84"
                height="14"
                rx="3"
                fill="rgba(0, 0, 0, 0.85)"
                stroke="#facc15"
                strokeWidth="0.8"
                className="transition-colors group-hover:fill-black"
              />
              <text
                x="4"
                y="-2"
                fill="#fef08a"
                fontSize="9"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight="bold"
                letterSpacing="0.05em"
              >
                {line.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
