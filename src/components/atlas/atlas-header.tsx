'use client';

// Layer 4: Compact Atlas Slice View Header (<100 lines)
import React from 'react';
import { ArrowLeft, Menu, Maximize2, Minimize2, Search } from 'lucide-react';
import type { AnatomyModuleDetails } from '@/types';

interface AtlasHeaderProps {
  activeModule: AnatomyModuleDetails | null;
  activeSeriesId?: number;
  onSelectSeries?: (seriesId: number) => void;
  isQuizMode?: boolean;
  onToggleQuiz?: () => void;
  language?: 'en' | 'la';
  onToggleLanguage?: () => void;
  showPins?: boolean;
  onTogglePins?: () => void;
  onChangeModuleClick: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  activePinsCount?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenGlobalSearch?: () => void;
}

export function AtlasHeader({
  activeModule,
  onChangeModuleClick,
  onToggleSidebar,
  isSidebarOpen,
  activePinsCount,
  isFullscreen,
  onToggleFullscreen,
  onOpenGlobalSearch,
}: AtlasHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-background/95 px-3 py-1.5 backdrop-blur-md shrink-0">
      {/* Left: Module title & Back / Selector */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onChangeModuleClick}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted cursor-pointer shrink-0"
          title="Browse anatomical modules (or click Back in top header)"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Modules</span>
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground truncate max-w-[200px] sm:max-w-md md:max-w-xl">
              {activeModule ? activeModule.title : 'IMAIOS eAnatomy Cross-Sectional Atlas'}
            </h1>
            {activeModule && (
              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary uppercase shrink-0">
                {activeModule.region}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
            {activeModule
              ? `${activeModule.series.length} series · ${activeModule.total_slices || activeModule.series.reduce((sum, s) => sum + (s.slice_count || s.slices?.length || 0), 0)} cross-sections`
              : 'Interactive 3D Anatomical Reference'}
          </span>
        </div>
      </div>

      {/* Right: Controls, Global Search & Mobile Structures Panel Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenGlobalSearch && (
          <button
            onClick={onOpenGlobalSearch}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:bg-muted/70 hover:text-foreground transition cursor-pointer"
            title="Search all cross-sectional anatomy (Ctrl+K / /)"
          >
            <Search className="h-3.5 w-3.5 text-primary" />
            <span className="hidden md:inline">Search all anatomy...</span>
            <span className="inline md:hidden text-[11px]">Search</span>
            <kbd className="hidden sm:inline-block rounded border border-border/60 bg-background/80 px-1 py-0.2 text-[9px] font-mono text-muted-foreground">
              Ctrl+K
            </kbd>
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted cursor-pointer"
            title={isFullscreen ? 'Exit Full Screen (Esc / F)' : 'Enter Full Screen (F)'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-primary" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>
        )}

        {onToggleSidebar && (
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              onClick={onToggleSidebar}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                isSidebarOpen
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/60 bg-background/80 text-foreground hover:bg-muted'
              }`}
              title="Toggle Structures & Categories Panel"
            >
              <Menu className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">Parts</span>
              {activePinsCount !== undefined && activePinsCount > 0 && (
                <span className="rounded-full bg-primary/20 px-1 py-0.2 text-[9px] font-mono text-primary">
                  {activePinsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
