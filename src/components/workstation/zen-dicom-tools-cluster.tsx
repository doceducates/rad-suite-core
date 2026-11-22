'use client';

import React from 'react';
import { Contrast, RotateCcw, Play, Pause } from 'lucide-react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import {
  DICOM_TOOLS,
  type ResponsiveHeaderTier,
} from './zen-dicom-toolbar-definitions';
import { cn } from '@/lib/utils';

export interface ZenDicomToolsClusterProps {
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  visibleToolIds: DicomTool[];
  tier: ResponsiveHeaderTier;
  invert?: boolean;
  onToggleInvert?: () => void;
  onResetViewport?: () => void;
  isCinePlaying?: boolean;
  onToggleCine?: () => void;
}

export function ZenDicomToolsCluster({
  activeTool,
  onSelectTool,
  visibleToolIds,
  tier,
  invert = false,
  onToggleInvert,
  onResetViewport,
  isCinePlaying = false,
  onToggleCine,
}: ZenDicomToolsClusterProps) {
  // Render only the tools designated for the header bar in the current responsive tier
  const visibleTools = DICOM_TOOLS.filter((t) => visibleToolIds.includes(t.id));
  const showInvert = tier !== 'compact';
  const showActions = tier === 'wide' || tier === 'ultra';

  return (
    <div className="flex items-center gap-0.5 overflow-hidden">
      {/* Dynamic Responsive Tools */}
      <div className="flex items-center gap-0.5 shrink-0">
        {visibleTools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTool(t.id)}
              className={cn(
                'h-7 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer border',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                  : 'bg-surface-container-high/60 hover:bg-surface-container-highest border-transparent text-muted-foreground hover:text-foreground'
              )}
              title={t.tooltip}
              aria-label={t.label}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tier === 'ultra' && t.shortLabel && (
                <span className="hidden xl:inline text-[10px]">{t.shortLabel}</span>
              )}
            </button>
          );
        })}
      </div>

      {showInvert && (
        <>
          <div className="w-px h-4.5 bg-outline-variant/50 mx-0.5 shrink-0" />

          {/* Contrast Invert Button */}
          {onToggleInvert && (
            <button
              type="button"
              onClick={onToggleInvert}
              className={cn(
                'h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer border shrink-0',
                invert
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface-container-high/60 hover:bg-surface-container-highest border-transparent text-muted-foreground hover:text-foreground'
              )}
              title="Invert Image Contrast (I)"
            >
              <Contrast className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}

      {showActions && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onResetViewport && (
            <button
              type="button"
              onClick={onResetViewport}
              className="h-7 w-7 rounded-md flex items-center justify-center bg-surface-container-high/60 hover:bg-surface-container-highest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Reset Viewport (Home)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleCine && (
            <button
              type="button"
              onClick={onToggleCine}
              className={cn(
                'h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer border shrink-0',
                isCinePlaying
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                  : 'bg-surface-container-high/60 hover:bg-surface-container-highest border-transparent text-muted-foreground hover:text-foreground'
              )}
              title="Play / Pause Cine Loop (Space)"
            >
              {isCinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden 2xl:inline text-[10px]">Cine</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
