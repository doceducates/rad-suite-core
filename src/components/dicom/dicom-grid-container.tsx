'use client';

import { useState } from 'react';
import { type ViewportLayoutMode } from '@/types/viewport';
import { type DicomTool } from './dicom-toolbar';
import { DicomCellViewport } from './dicom-cell-viewport';
import { DicomMobileMatrixNav } from './dicom-mobile-matrix-nav';
import { DicomMobileMatrixOverview } from './dicom-mobile-matrix-overview';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Link2, Link2Off, Eye, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DicomGridContainerProps {
  layout: ViewportLayoutMode;
  seriesList: any[];
  activeTool: DicomTool;
  modality: string;
  accessionNumber: string;
}

export function DicomGridContainer({
  layout,
  seriesList,
  activeTool,
  modality,
  accessionNumber: _accessionNumber,
}: DicomGridContainerProps) {
  const isMobile = useIsMobile();
  const [activeCellIndex, setActiveCellIndex] = useState<number>(0);
  const [syncScroll, setSyncScroll] = useState(false);
  const [syncedSlice, setSyncedSlice] = useState<number>(0);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'focus' | 'all'>('focus');

  // Compute cell counts, rows, cols
  const { cellCount, rows, cols } = (() => {
    switch (layout) {
      case '1x2': return { cellCount: 2, rows: 1, cols: 2 };
      case '1x3': return { cellCount: 3, rows: 1, cols: 3 };
      case '2x2': return { cellCount: 4, rows: 2, cols: 2 };
      case '3x3': return { cellCount: 9, rows: 3, cols: 3 };
      case '4x4': return { cellCount: 16, rows: 4, cols: 4 };
      default: return { cellCount: 1, rows: 1, cols: 1 };
    }
  })();

  const [cellSeriesIndices, setCellSeriesIndices] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (let i = 0; i < 16; i++) {
      init[i] = i % Math.max(1, seriesList.length);
    }
    return init;
  });

  const handleSelectSeries = (cellIdx: number, index: number) => {
    setCellSeriesIndices((prev) => ({ ...prev, [cellIdx]: index }));
  };

  const cellIds = Array.from({ length: cellCount }, (_, i) => i);

  const gridClass =
    layout === '1x1'
      ? 'grid-cols-1'
      : layout === '1x2'
      ? 'grid-cols-1 md:grid-cols-2'
      : layout === '1x3'
      ? 'grid-cols-1 md:grid-cols-3'
      : layout === '2x2'
      ? 'grid-cols-1 sm:grid-cols-2'
      : layout === '3x3'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';

  return (
    <div className="space-y-2 select-none">
      {/* Multi-View Subheader: Layout indicator & Sync toggle */}
      {layout !== '1x1' && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 rounded-xl border border-zinc-800 text-[11px] text-zinc-300">
          <div className="flex items-center gap-2">
            <span>
              Layout: <strong className="text-primary font-mono font-bold">{layout}</strong>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              Active: <span className="text-white font-mono font-bold">P{activeCellIndex + 1}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile View Toggle between Focus Hero Pane vs Stitched Grid */}
            {isMobile && cellCount > 2 && (
              <button
                type="button"
                onClick={() => setMobileViewMode(mobileViewMode === 'focus' ? 'all' : 'focus')}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition-colors text-[10px] cursor-pointer',
                  mobileViewMode === 'focus'
                    ? 'bg-zinc-800 text-primary border border-zinc-700'
                    : 'bg-primary/20 text-primary border border-primary/40'
                )}
                title="Toggle between full focus pane and multi-tile view"
              >
                {mobileViewMode === 'focus' ? <Eye className="w-3 h-3" /> : <Grid className="w-3 h-3" />}
                <span>{mobileViewMode === 'focus' ? 'Focus Mode' : 'Tile Grid'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSyncScroll(!syncScroll)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium transition-colors text-[10px] cursor-pointer',
                syncScroll
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              )}
            >
              {syncScroll ? <Link2 className="w-3 h-3 text-primary" /> : <Link2Off className="w-3 h-3" />}
              <span>Sync Scroll</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Focus Hero Pane Mode (For 2x2, 3x3, 4x4 on phones) */}
      {isMobile && cellCount > 2 && mobileViewMode === 'focus' ? (
        <div className="space-y-2">
          {/* Active Hero Pane Viewport */}
          <DicomCellViewport
            key={`hero-${activeCellIndex}`}
            cellId={`cell-${activeCellIndex}`}
            seriesList={seriesList}
            seriesIndex={cellSeriesIndices[activeCellIndex] ?? activeCellIndex % seriesList.length}
            onSelectSeries={(idx) => handleSelectSeries(activeCellIndex, idx)}
            activeTool={activeTool}
            modality={modality}
            isActive={true}
            onActivate={() => {}}
            syncedSlice={syncScroll ? syncedSlice : undefined}
          />

          {/* Matrix Minimap Pager */}
          <DicomMobileMatrixNav
            totalPanes={cellCount}
            activePaneIndex={activeCellIndex}
            rows={rows}
            cols={cols}
            onSelectPane={setActiveCellIndex}
            onOpenOverview={() => setIsOverviewOpen(true)}
          />
        </div>
      ) : (
        /* Full Responsive Grid (Desktop, Tablets, or 1x2) */
        <div className={`grid ${gridClass} gap-2`}>
          {cellIds.map((idx) => (
            <DicomCellViewport
              key={idx}
              cellId={`cell-${idx}`}
              seriesList={seriesList}
              seriesIndex={cellSeriesIndices[idx] ?? idx % seriesList.length}
              onSelectSeries={(seriesIdx) => handleSelectSeries(idx, seriesIdx)}
              activeTool={activeTool}
              modality={modality}
              isActive={activeCellIndex === idx}
              onActivate={() => setActiveCellIndex(idx)}
              syncedSlice={syncScroll ? syncedSlice : undefined}
            />
          ))}
        </div>
      )}

      {/* 1-Tap 16-Cell Contact Sheet Overview Modal */}
      <DicomMobileMatrixOverview
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        totalPanes={cellCount}
        activePaneIndex={activeCellIndex}
        rows={rows}
        cols={cols}
        seriesList={seriesList}
        cellSeriesMap={cellSeriesIndices}
        onSelectPane={setActiveCellIndex}
      />
    </div>
  );
}
