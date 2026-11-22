'use client';

import React from 'react';
import { PieChart, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { ModalityCount, HourlyReportVolume } from '@/types/dashboard';

interface DashboardModalityChartProps {
  modalities: ModalityCount[];
  hourlyCurve: HourlyReportVolume[];
}

export function DashboardModalityChart({
  modalities,
  hourlyCurve,
}: DashboardModalityChartProps) {
  const maxCount = Math.max(1, ...hourlyCurve.map((h) => h.count));

  // Compute SVG sparkline points
  const width = 360;
  const height = 65;
  const paddingX = 10;
  const paddingY = 8;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const points = hourlyCurve.map((h, i) => {
    const x = paddingX + (i / (hourlyCurve.length - 1)) * usableWidth;
    const y = height - paddingY - (h.count / maxCount) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPoints = `${paddingX},${height - paddingY} ${points} ${width - paddingX},${height - paddingY}`;

  return (
    <Card className="bg-surface-container-low border-outline-variant/60 shadow-xs flex flex-col h-full">
      <CardHeader className="pb-3 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            <span>Modality & Reporting Pace</span>
          </CardTitle>
          <span className="text-[11px] font-mono text-secondary">Today&apos;s Case Mix</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-5 pt-0">
        {/* Modality Mix Stacked Progress & Badges */}
        <div className="space-y-2">
          {/* Visual Stacked Bar */}
          <div className="w-full h-3 rounded-full bg-surface-container-high flex overflow-hidden p-0.5 gap-0.5">
            {modalities.map((m) => {
              if (m.percentage <= 0) return null;
              return (
                <div
                  key={m.modality}
                  style={{ width: `${m.percentage}%` }}
                  title={`${m.modality}: ${m.count} cases (${m.percentage}%)`}
                  className={`h-full rounded-xs transition-all duration-300 ${
                    m.modality === 'MR'
                      ? 'bg-emerald-500'
                      : m.modality === 'CT'
                      ? 'bg-sky-500'
                      : m.modality === 'XR'
                      ? 'bg-amber-500'
                      : m.modality === 'US'
                      ? 'bg-purple-500'
                      : 'bg-secondary'
                  }`}
                />
              );
            })}
          </div>

          {/* Interactive Modality Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {modalities
              .filter((m) => m.modality !== 'OTHER' || m.count > 0)
              .map((m) => (
                <div
                  key={m.modality}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs font-mono ${m.colorClass}`}
                >
                  <span className="font-bold">{m.modality}</span>
                  <span className="font-semibold">
                    {m.count} <span className="opacity-70 text-[10px]">({m.percentage}%)</span>
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Hourly Reporting Sparkline */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-on-surface flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span>Shift Cadence</span>
            </span>
            <span className="text-secondary text-[11px] font-mono">
              Peak: {maxCount} / hr
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-container/50 border border-outline-variant/40">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-16 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Fill */}
              <polygon points={areaPoints} fill="url(#curveGradient)" />

              {/* Smooth Stroke Line */}
              <polyline
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>

            {/* Time Marker Labels */}
            <div className="flex justify-between text-[10px] text-secondary font-mono mt-1 px-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
