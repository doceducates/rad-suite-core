'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Palette, Moon, Sun, Monitor, Eye } from 'lucide-react';
import { GpuAccelerationSettings } from './gpu-acceleration-settings';

export function WorkstationDisplaySettings() {
  return (
    <div className="space-y-6 text-xs">
      <GpuAccelerationSettings />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-500" /> Workstation Theme & Reading Room Ambiance
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px]">
              Ambient Adaptive
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low">
            <div className="space-y-1">
              <div className="font-semibold text-on-surface text-sm flex items-center gap-2">
                Theme Toggle
              </div>
              <p className="text-[11px] text-secondary">
                Switch between high-contrast PACS reading room dark mode and daylight clinical light mode.
              </p>
            </div>
            <div className="shrink-0">
              <ThemeToggle />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reading Room Dark Mode Card */}
            <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-zinc-950 text-zinc-100 space-y-2">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-primary" />
                <span className="font-semibold text-xs text-zinc-100">PACS Reading Room (Dark Mode)</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Optimized for low-ambient illumination reading rooms. Maximizes perceived grayscale dynamic range and minimizes eye fatigue during long cross-sectional review sessions.
              </p>
              <div className="text-[10px] font-mono text-primary/80 pt-1">
                Background: Deep Slate (#09090b) • High Grayscale Contrast
              </div>
            </div>

            {/* Daylight Clinical Mode Card */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 space-y-2">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-xs text-zinc-900">Daylight Clinical (Light Mode)</span>
              </div>
              <p className="text-[11px] text-zinc-600">
                Configured for consultation rooms, hospital administrative offices, and high ambient-light clinical environments with crisp typography and subtle borders.
              </p>
              <div className="text-[10px] font-mono text-zinc-600 pt-1">
                Background: Clean Off-White (#fcfcfc) • Crisp Typography
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
