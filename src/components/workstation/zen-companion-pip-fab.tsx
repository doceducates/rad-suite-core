'use client';

import React from 'react';
import {
  Layers,
  Lightbulb,
  MessageSquare,
  BookOpen,
  CheckSquare,
  FileText,
  Compass,
  Sparkles,
  Move,
  PictureInPicture,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanionTab, getCompanionTabLabel } from '@/services/companion-tab.service';

export interface ZenCompanionPipFabProps {
  pillPos?: { x: number; y: number } | null;
  onMouseDown?: (e: React.MouseEvent) => void;
  isPillDragging?: boolean;
  onRestore: (e: React.MouseEvent) => void;
  onPopout?: (e?: React.MouseEvent) => void;
  activeTab: CompanionTab;
  seriesName?: string;
  activeSeriesIndex: number;
}

export function ZenCompanionPipFab({
  pillPos = null,
  onMouseDown,
  isPillDragging = false,
  onRestore,
  onPopout,
  activeTab,
  seriesName,
  activeSeriesIndex,
}: ZenCompanionPipFabProps) {
  const fabStyle = pillPos
    ? { left: `${pillPos.x}px`, top: `${pillPos.y}px` }
    : { right: '24px', bottom: '24px' };

  const renderTabIcon = () => {
    switch (activeTab) {
      case 'images':
        return <Layers className="w-5 h-5 text-cyan-400" />;
      case 'insights_ddx':
        return <Lightbulb className="w-5 h-5 text-amber-400" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-primary" />;
      case 'radiopaedia':
        return <BookOpen className="w-5 h-5 text-violet-400" />;
      case 'findings':
        return <CheckSquare className="w-5 h-5 text-emerald-400" />;
      case 'atlas':
        return <Compass className="w-5 h-5 text-primary" />;
      case 'report':
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  const tabLabel =
    activeTab === 'images'
      ? seriesName || `Series #${activeSeriesIndex + 1}`
      : getCompanionTabLabel(activeTab);

  return (
    <div
      style={fabStyle}
      onMouseDown={onMouseDown}
      className={cn(
        'fixed z-50 select-none cursor-move group transition-shadow flex items-center gap-1.5',
        isPillDragging && 'cursor-grabbing ring-2 ring-primary/80 rounded-full'
      )}
      title={`Companion (${tabLabel}) — Click to restore | Drag to move`}
    >
      {onPopout && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onPopout(e);
          }}
          className="w-8 h-8 rounded-full bg-surface-container-high/95 backdrop-blur-md border border-outline-variant/60 text-muted-foreground hover:text-primary hover:border-primary shadow-lg flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer"
          title="Pop out to Floating Window (Alt+3)"
          aria-label="Pop out to Floating Window"
        >
          <PictureInPicture className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={onRestore}
        className={cn(
          'relative w-12 h-12 rounded-full bg-surface-container-high/95 backdrop-blur-md border border-primary/50 shadow-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:border-primary active:scale-95 cursor-pointer',
          isPillDragging && 'shadow-primary/40'
        )}
        aria-label={`Restore Companion Window (${tabLabel})`}
      >
        {renderTabIcon()}

        {/* Live Active Status Indicator */}
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary border border-surface" />
        </span>

        {/* Drag Icon Indicator on Hover */}
        <span className="absolute -bottom-1 -left-1 p-0.5 rounded-full bg-surface-container border border-outline-variant/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <Move className="w-2.5 h-2.5" />
        </span>

        {/* AI Sparkle Accent if in Copilot/Insights */}
        {(activeTab === 'chat' || activeTab === 'insights_ddx') && (
          <span className="absolute -top-1 -left-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/90 text-white shadow-2xs">
            <Sparkles className="w-2 h-2" />
          </span>
        )}

        {/* Hover Tooltip Pill */}
        <span className="absolute right-full mr-2.5 px-2.5 py-1 rounded-xl bg-surface-container-highest/95 backdrop-blur-md border border-outline-variant/80 text-[11px] font-semibold text-on-surface whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
          Restore {tabLabel} Companion
        </span>
      </button>
    </div>
  );
}
