'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Layers,
  Grid,
  ChevronDown,
  ArrowLeftRight,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { DicomTool } from '@/components/dicom/dicom-toolbar';
import type { ViewportLayoutMode } from '@/types/viewport';
import { ZenDicomLayoutPopover } from './zen-dicom-layout-popover';
import { ZenDicomToolsCluster } from './zen-dicom-tools-cluster';
import { ZenDicomOverflowMenu } from './zen-dicom-overflow-menu';
import {
  DICOM_TOOLS,
  getResponsiveTier,
  getVisibleToolIds,
  type ResponsiveHeaderTier,
} from './zen-dicom-toolbar-definitions';
import type { ClinicalPreset } from '@/services/clinical-presets.service';
import { cn } from '@/lib/utils';

export interface ZenDicomViewportHeaderProps {
  isSeriesVisible?: boolean;
  onToggleSeries?: () => void;
  layout?: ViewportLayoutMode;
  onSelectLayout?: (mode: ViewportLayoutMode) => void;
  activeTool: DicomTool;
  onSelectTool: (tool: DicomTool) => void;
  ww?: number;
  wc?: number;
  onWwWcChange?: (ww: number, wc: number) => void;
  activePresetId?: string;
  onSelectPreset?: (preset: ClinicalPreset) => void;
  modality?: string;
  seriesDescription?: string;
  sliceCount?: number;
  invert?: boolean;
  onToggleInvert?: () => void;
  onResetViewport?: () => void;
  isCinePlaying?: boolean;
  onToggleCine?: () => void;
  onSnapshot?: () => void;
  onSwapCenter?: () => void;
  isCompanion?: boolean;
}

export function ZenDicomViewportHeader({
  isSeriesVisible = false,
  onToggleSeries,
  layout = '1x1',
  onSelectLayout,
  activeTool,
  onSelectTool,
  invert = false,
  onToggleInvert,
  onResetViewport,
  isCinePlaying = false,
  onToggleCine,
  onSnapshot,
  onSwapCenter,
  isCompanion = false,
}: ZenDicomViewportHeaderProps) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [headerWidth, setHeaderWidth] = useState<number>(1000);
  const headerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to detect header width and compute responsive tiers
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    setHeaderWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tier: ResponsiveHeaderTier = useMemo(() => getResponsiveTier(headerWidth), [headerWidth]);
  const visibleToolIds = useMemo(() => getVisibleToolIds(tier), [tier]);
  const overflowTools = useMemo(
    () => DICOM_TOOLS.filter((t) => !visibleToolIds.includes(t.id)),
    [visibleToolIds]
  );

  const isOverflowActive = overflowTools.some((t) => t.id === activeTool);
  const showInvertInMore = tier === 'compact' && !!onToggleInvert;
  const showActionsInMore = tier === 'compact' || tier === 'medium';

  return (
    <div
      ref={headerRef}
      className="h-9 px-2 bg-surface-container/95 border-b border-outline-variant/60 flex items-center justify-between text-xs text-foreground shrink-0 select-none gap-1.5 relative z-30"
    >
      {/* Left Cluster: Sequence Drawer Toggle + Graph of Views */}
      <div className="flex items-center gap-1 min-w-0 shrink-0">
        {onToggleSeries && (
          <button
            type="button"
            onClick={onToggleSeries}
            className={cn(
              'h-7 px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs',
              isSeriesVisible
                ? 'bg-primary/15 border-primary text-primary'
                : 'bg-surface-container-high hover:bg-surface-container-highest border-outline-variant/60 text-muted-foreground hover:text-foreground'
            )}
            title={isSeriesVisible ? 'Hide Series Drawer (Ctrl+D)' : 'Show Series Drawer (Ctrl+D)'}
            aria-label="Toggle Series Drawer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Series</span>
          </button>
        )}

        {onSelectLayout && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setLayoutOpen((prev) => !prev)}
              className={cn(
                'h-7 px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs',
                layoutOpen || layout !== '1x1'
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-surface-container-high hover:bg-surface-container-highest border-outline-variant/60 text-muted-foreground hover:text-foreground'
              )}
              title="Graph of Views — Select Viewport Layout"
              aria-label="Select Viewport Layout"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px] hidden sm:inline">{layout}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <ZenDicomLayoutPopover
              isOpen={layoutOpen}
              onClose={() => setLayoutOpen(false)}
              currentLayout={layout}
              onSelectLayout={onSelectLayout}
            />
          </div>
        )}
      </div>

      {/* Middle Cluster: Adaptive Clinical Tools (strictly non-duplicated) */}
      <ZenDicomToolsCluster
        activeTool={activeTool}
        onSelectTool={onSelectTool}
        visibleToolIds={visibleToolIds}
        tier={tier}
        invert={invert}
        onToggleInvert={onToggleInvert}
        onResetViewport={onResetViewport}
        isCinePlaying={isCinePlaying}
        onToggleCine={onToggleCine}
      />

      {/* Right Cluster: Stepping Navigation + Overflow Menu + Swap to Report */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Quick Slice Stepping Navigation (Vitrea MMV << < > >>) */}
        <div className="hidden sm:flex items-center gap-0.5 bg-surface-container-high/60 border border-outline-variant/50 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('zen:dicom:step-slice', { detail: { action: 'first' } }))}
            className="h-6 w-6 rounded hover:bg-surface-container-highest text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title="First Slice (Home / <<)"
            aria-label="First Slice"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('zen:dicom:step-slice', { detail: { action: 'prev' } }))}
            className="h-6 w-6 rounded hover:bg-surface-container-highest text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title="Previous Slice (PageUp / <)"
            aria-label="Previous Slice"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('zen:dicom:step-slice', { detail: { action: 'next' } }))}
            className="h-6 w-6 rounded hover:bg-surface-container-highest text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title="Next Slice (PageDown / >)"
            aria-label="Next Slice"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('zen:dicom:step-slice', { detail: { action: 'last' } }))}
            className="h-6 w-6 rounded hover:bg-surface-container-highest text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            title="Last Slice (End / >>)"
            aria-label="Last Slice"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer border',
              isOverflowActive
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-surface-container-high hover:bg-surface-container-highest text-muted-foreground hover:text-foreground border-outline-variant/60'
            )}
            title="More Viewport Tools & Options"
            aria-label="More Viewport Tools"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          <ZenDicomOverflowMenu
            isOpen={moreOpen}
            onClose={() => setMoreOpen(false)}
            overflowTools={overflowTools}
            activeTool={activeTool}
            onSelectTool={onSelectTool}
            showInvert={showInvertInMore}
            invert={invert}
            onToggleInvert={onToggleInvert}
            showActions={showActionsInMore}
            isCinePlaying={isCinePlaying}
            onToggleCine={onToggleCine}
            onResetViewport={onResetViewport}
            onSnapshot={onSnapshot}
          />
        </div>

        {onSwapCenter && (
          <button
            type="button"
            onClick={onSwapCenter}
            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-surface-container-high hover:bg-surface-container-highest text-foreground flex items-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/60 shadow-2xs shrink-0"
            title={isCompanion ? 'Move DICOM Viewport to Center Stage' : 'Swap Report Editor back to Center Stage'}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">{isCompanion ? 'Swap to Center' : 'Swap to Report'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
