'use client';

import React from 'react';
import {
  Move,
  RotateCcw,
  Maximize2,
  Minus,
  X,
  FileText,
  Layers,
  Stethoscope,
  MessageSquare,
  BookOpen,
  Compass,
  Columns2,
  PictureInPicture,
} from 'lucide-react';
import { CompanionTab, COMPANION_TABS, getCompanionTabLabel } from '@/services/companion-tab.service';
import { cn } from '@/lib/utils';

export interface ZenCompanionHeaderProps {
  docked?: boolean;
  activeTab: CompanionTab;
  onSelectTab: (tab: CompanionTab) => void;
  onDragMouseDown?: (e: React.MouseEvent) => void;
  onDoubleClickHeader?: () => void;
  onReset?: () => void;
  onToggleSplit?: () => void;
  onMaximize?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  hasCriticalFinding?: boolean;
}

export function ZenCompanionHeader({
  docked = false,
  activeTab,
  onSelectTab,
  onDragMouseDown,
  onDoubleClickHeader,
  onReset,
  onToggleSplit,
  onMaximize,
  onMinimize,
  onClose,
  hasCriticalFinding,
}: ZenCompanionHeaderProps) {
  const renderTabIcon = (tab: CompanionTab) => {
    switch (tab) {
      case 'report':
        return <FileText className="w-3 h-3 shrink-0" />;
      case 'images':
        return <Layers className="w-3 h-3 shrink-0" />;
      case 'ddx':
        return <Stethoscope className="w-3 h-3 shrink-0" />;
      case 'chat':
        return <MessageSquare className="w-3 h-3 shrink-0" />;
      case 'guidance':
        return <BookOpen className="w-3 h-3 shrink-0" />;
      case 'atlas':
        return <Compass className="w-3 h-3 shrink-0" />;
    }
  };

  return (
    <div
      onMouseDown={docked ? undefined : onDragMouseDown}
      onDoubleClick={onDoubleClickHeader}
      className={cn(
        'h-10 px-2 bg-surface-container/95 border-b border-border flex items-center justify-between text-xs text-foreground shrink-0 gap-1.5 select-none',
        !docked && 'cursor-grab active:cursor-grabbing rounded-t-2xl'
      )}
      title={docked ? undefined : 'Drag to reposition (Double-click to reset position)'}
    >
      {/* Left: Drag Handle (if floating) & Unified Tab Switcher */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {!docked && (
          <button
            type="button"
            onMouseDown={onDragMouseDown}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground hover:bg-surface-container-high rounded transition-colors shrink-0"
            title="Drag window"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
        )}

        <div
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {COMPANION_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0 cursor-pointer relative',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                )}
              >
                {renderTabIcon(tab)}
                <span>{getCompanionTabLabel(tab)}</span>
                {tab === 'report' && hasCriticalFinding && (
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Drag Spacer */}
      {!docked && (
        <div
          className="flex-1 h-full min-w-3 cursor-grab active:cursor-grabbing"
          onMouseDown={onDragMouseDown}
        />
      )}

      {/* Right: Window Controls */}
      <div className="flex items-center gap-0.5 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title={docked ? 'Reset split ratio to 50/50' : 'Reset position to bottom-right'}
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}

        {/* 1-Click Split / Floating Mode Switcher Button */}
        {onToggleSplit && (
          <button
            type="button"
            onClick={onToggleSplit}
            title={docked ? 'Pop out to Floating Window (Alt+3)' : 'Dock to Split Screen (Alt+2)'}
            className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            {docked ? (
              <PictureInPicture className="w-3.5 h-3.5" />
            ) : (
              <Columns2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {onMaximize && (
          <button
            type="button"
            onClick={onMaximize}
            title="Maximize to Studio (Alt+4)"
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}

        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            title={docked ? 'Minimize to FAB (Alt+1)' : 'Minimize to FAB (Alt+1)'}
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title={docked ? 'Close panel' : 'Minimize to FAB (Alt+1)'}
            className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
