'use client';

import React from 'react';
import { Move, FileText, Layers, Stethoscope, MessageSquare, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanionTab } from '@/services/companion-tab.service';

interface ZenCompanionPipPillProps {
  pillPos: { x: number; y: number } | null;
  onMouseDown: (e: React.MouseEvent) => void;
  isPillDragging: boolean;
  onSelectTab: (tab: CompanionTab, e: React.MouseEvent) => void;
  onRestore: (e: React.MouseEvent) => void;
  activeTab: CompanionTab;
  seriesName?: string;
  activeSeriesIndex: number;
}

export function ZenCompanionPipPill({
  pillPos,
  onMouseDown,
  isPillDragging,
  onSelectTab,
  onRestore,
  activeTab,
  seriesName,
  activeSeriesIndex,
}: ZenCompanionPipPillProps) {
  const pillStyle = pillPos
    ? { left: `${pillPos.x}px`, top: `${pillPos.y}px` }
    : { right: '24px', bottom: '16px' };

  return (
    <div
      style={pillStyle}
      onMouseDown={onMouseDown}
      className={cn(
        'fixed z-50 px-2.5 py-1.5 rounded-full bg-surface-container-high/95 backdrop-blur-md border border-primary/50 shadow-2xl flex items-center gap-1.5 select-none cursor-move transition-shadow',
        isPillDragging && 'ring-2 ring-primary/80 shadow-primary/30 cursor-grabbing'
      )}
      title="Drag anywhere to reposition pill"
    >
      <Move className="w-3 h-3 text-muted-foreground ml-0.5 shrink-0" />
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />

      <button
        type="button"
        onClick={(e) => onSelectTab('report', e)}
        className={cn(
          'px-2 py-1 rounded-full text-xs font-mono flex items-center gap-1 transition-all cursor-pointer',
          activeTab === 'report' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <FileText className="w-3 h-3" />
        <span>Report</span>
      </button>

      <button
        type="button"
        onClick={(e) => onSelectTab('images', e)}
        className={cn(
          'px-2 py-1 rounded-full text-xs font-mono flex items-center gap-1 transition-all cursor-pointer',
          activeTab === 'images' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Layers className="w-3 h-3" />
        <span>{seriesName || `Series #${activeSeriesIndex + 1}`}</span>
      </button>

      <button
        type="button"
        onClick={(e) => onSelectTab('insights_ddx', e)}
        className={cn(
          'px-2 py-1 rounded-full text-xs font-mono flex items-center gap-1 transition-all cursor-pointer',
          activeTab === 'insights_ddx' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Stethoscope className="w-3 h-3" />
        <span>Insights</span>
      </button>

      <button
        type="button"
        onClick={(e) => onSelectTab('chat', e)}
        className={cn(
          'px-2 py-1 rounded-full text-xs font-mono flex items-center gap-1 transition-all cursor-pointer',
          activeTab === 'chat' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <MessageSquare className="w-3 h-3" />
      </button>

      <button
        type="button"
        onClick={onRestore}
        className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-surface-container transition-colors ml-0.5 cursor-pointer"
        title="Restore full window"
      >
        <Maximize2 className="w-3 h-3" />
      </button>
    </div>
  );
}
