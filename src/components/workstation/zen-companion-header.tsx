'use client';

import React from 'react';
import {
  Move,
  RotateCcw,
  Maximize2,
  Minimize2,
  Minus,
  X,
  FileText,
  Layers,
  Lightbulb,
  MessageSquare,
  BookOpen,
  CheckSquare,
  Compass,
  Columns2,
  PictureInPicture,
  ChevronDown,
  ArrowLeftRight,
} from 'lucide-react';
import {
  CompanionTab,
  COMPANION_TABS,
  COMPANION_TAB_METADATA,
  getCompanionTabLabel,
} from '@/services/companion-tab.service';
import { cn } from '@/lib/utils';
import type { WorkstationCenterView } from '@/hooks/use-three-column-layout';

export type CompanionWindowMode = 'docked' | 'floating' | 'maximized';

export interface ZenCompanionHeaderProps {
  mode?: CompanionWindowMode;
  docked?: boolean;
  activeTab: CompanionTab;
  onSelectTab: (tab: CompanionTab) => void;
  centerView?: WorkstationCenterView;
  onSwapCenter?: () => void;
  onDragMouseDown?: (e: React.MouseEvent) => void;
  onDoubleClickHeader?: () => void;
  onReset?: () => void;
  onToggleFloat?: () => void;
  onToggleSplit?: () => void;
  onMaximize?: () => void;
  onRestore?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  hasCriticalFinding?: boolean;
}

export function ZenCompanionHeader({
  mode = 'docked',
  docked = false,
  activeTab,
  onSelectTab,
  centerView,
  onSwapCenter,
  onDragMouseDown,
  onDoubleClickHeader,
  onReset,
  onToggleFloat,
  onToggleSplit,
  onMaximize,
  onRestore,
  onMinimize,
  onClose,
  hasCriticalFinding,
}: ZenCompanionHeaderProps) {
  const isFloating = mode === 'floating' || (!docked && mode !== 'maximized');
  const isMaximized = mode === 'maximized';

  const orderedTabs: readonly CompanionTab[] = centerView === 'images'
    ? ['report', 'insights_ddx', 'chat', 'radiopaedia', 'findings', 'atlas', 'images'] as const
    : COMPANION_TABS;

  const renderTabIcon = (tab: CompanionTab, className = 'w-3 h-3 shrink-0') => {
    switch (tab) {
      case 'images':
        return <Layers className={className} />;
      case 'insights_ddx':
        return <Lightbulb className={cn(className, 'text-amber-400')} />;
      case 'chat':
        return <MessageSquare className={className} />;
      case 'radiopaedia':
        return <BookOpen className={className} />;
      case 'findings':
        return <CheckSquare className={cn(className, 'text-emerald-400')} />;
      case 'report':
        return <FileText className={className} />;
      case 'atlas':
        return <Compass className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  return (
    <div
      onMouseDown={isFloating ? onDragMouseDown : undefined}
      onDoubleClick={onDoubleClickHeader}
      className={cn(
        'h-10 px-2 bg-surface-container/95 border-b border-outline-variant/50 flex items-center justify-between text-xs text-foreground shrink-0 gap-1.5 select-none',
        isFloating && 'cursor-grab active:cursor-grabbing rounded-t-2xl shadow-xs'
      )}
      title={isFloating ? 'Drag to reposition (Double-click to reset)' : undefined}
    >
      {/* Left Area: Drag Handle (if floating) & Responsive Tab Switcher */}
      <div className="flex items-center gap-1 min-w-0 overflow-hidden py-0.5">
        {isFloating && (
          <button
            type="button"
            onMouseDown={onDragMouseDown}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground hover:bg-surface-container-high rounded transition-colors shrink-0"
            title="Drag window"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Compact Dropdown Selector (Active on narrower container / mobile) */}
        <div className="flex lg:hidden items-center shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <div className="relative flex items-center">
            <span className="absolute left-2 pointer-events-none">
              {renderTabIcon(activeTab, 'w-3 h-3 text-primary')}
            </span>
            <select
              value={activeTab}
              onChange={(e) => onSelectTab(e.target.value as CompanionTab)}
              aria-label="Select Workstation Companion Tab"
              className="appearance-none bg-surface-container-high border border-outline-variant/60 rounded-lg pl-7 pr-6 py-1 text-[11px] font-semibold text-foreground cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
            >
              {orderedTabs.map((tab) => (
                <option key={tab} value={tab}>
                  {getCompanionTabLabel(tab)}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 pointer-events-none" />
          </div>
        </div>

        {/* Full Tab Chips (Visible on desktop / wide container) */}
        <div
          className="hidden lg:flex items-center gap-0.5 overflow-x-auto no-scrollbar"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {orderedTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={cn(
                  'px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all shrink-0 cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-high'
                )}
                title={COMPANION_TAB_METADATA[tab]?.description}
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

      {/* Center Spacer for Floating Dragging */}
      {isFloating && (
        <div
          className="flex-1 h-full min-w-2 cursor-grab active:cursor-grabbing"
          onMouseDown={onDragMouseDown}
        />
      )}

      {/* Right Area: Unified Window Controls */}
      <div className="flex items-center gap-0.5 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
        {onSwapCenter && (
          <button
            type="button"
            onClick={onSwapCenter}
            title={`Swap with Center Screen (${centerView === 'report' ? 'Move images to center' : 'Move report to center'})`}
            className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        )}

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title={isFloating ? 'Reset window position' : 'Reset column width (340px)'}
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Float / Dock Switcher */}
        {(onToggleFloat || onToggleSplit) && (
          <button
            type="button"
            onClick={onToggleFloat || onToggleSplit}
            title={isFloating ? 'Dock to Right Column (Alt+2)' : 'Pop out to Floating Window (Alt+3)'}
            className="p-1 text-muted-foreground hover:text-primary rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            {isFloating ? (
              <Columns2 className="w-3.5 h-3.5" />
            ) : (
              <PictureInPicture className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Maximize / Restore Switcher */}
        {isMaximized && onRestore ? (
          <button
            type="button"
            onClick={onRestore}
            title="Restore Window (Alt+4)"
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        ) : onMaximize ? (
          <button
            type="button"
            onClick={onMaximize}
            title="Maximize to Full Stage (Alt+4)"
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        ) : null}

        {/* Minimize to FAB */}
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            title="Minimize to Floating Action Button (Alt+1)"
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Close / Collapse */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title={isFloating ? 'Close window' : 'Collapse Right Column'}
            className="p-1 text-muted-foreground hover:text-error rounded hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
