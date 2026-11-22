'use client';

import React from 'react';
import {
  PanelRightOpen,
  PictureInPicture,
  Layers,
  Lightbulb,
  MessageSquare,
  BookOpen,
  CheckSquare,
} from 'lucide-react';
import { CompanionTab, getCompanionTabLabel } from '@/services/companion-tab.service';
import { cn } from '@/lib/utils';

export interface ZenCompanionSlimRailProps {
  activeTab: CompanionTab;
  onSelectTab: (tab: CompanionTab) => void;
  onExpand: () => void;
  onToggleFloat?: () => void;
}

export function ZenCompanionSlimRail({
  activeTab,
  onSelectTab,
  onExpand,
  onToggleFloat,
}: ZenCompanionSlimRailProps) {
  const handleLaunch = (tab: CompanionTab) => {
    onSelectTab(tab);
    onExpand();
  };

  return (
    <div className="w-12 h-full bg-surface-container-low border-l border-outline-variant/50 flex flex-col items-center py-2 shrink-0 select-none transition-all duration-200">
      <button
        type="button"
        onClick={onExpand}
        className="p-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        title="Expand Right Workstation Companion"
      >
        <PanelRightOpen className="w-4 h-4 text-primary" />
      </button>

      {onToggleFloat && (
        <button
          type="button"
          onClick={onToggleFloat}
          className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer mt-1"
          title="Pop out to Floating Window (Alt+3)"
        >
          <PictureInPicture className="w-4 h-4 text-primary" />
        </button>
      )}

      <div className="mt-4 flex flex-col items-center gap-3">
        {/* 1-Click Launch Images */}
        <button
          type="button"
          onClick={() => handleLaunch('images')}
          className={cn(
            'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
            activeTab === 'images'
              ? 'bg-primary/15 text-primary shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-container'
          )}
          title="1-Click: Open PACS DICOM Viewer"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
        </button>

        {/* 1-Click Launch Insights */}
        <button
          type="button"
          onClick={() => handleLaunch('insights_ddx')}
          className={cn(
            'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
            activeTab === 'insights_ddx'
              ? 'bg-primary/15 text-primary shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-container'
          )}
          title="1-Click: Open Case Insights & Differentials"
        >
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </button>

        {/* 1-Click Launch Copilot Chat */}
        <button
          type="button"
          onClick={() => handleLaunch('chat')}
          className={cn(
            'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
            activeTab === 'chat'
              ? 'bg-primary/15 text-primary shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-container'
          )}
          title="1-Click: Open Copilot AI Chat"
        >
          <MessageSquare className="w-4 h-4 text-primary" />
        </button>

        {/* 1-Click Launch Radiopaedia */}
        <button
          type="button"
          onClick={() => handleLaunch('radiopaedia')}
          className={cn(
            'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
            activeTab === 'radiopaedia'
              ? 'bg-primary/15 text-primary shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-container'
          )}
          title="1-Click: Open Radiopaedia Webview"
        >
          <BookOpen className="w-4 h-4 text-violet-400" />
        </button>

        {/* 1-Click Launch Findings */}
        <button
          type="button"
          onClick={() => handleLaunch('findings')}
          className={cn(
            'p-2 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-1 group',
            activeTab === 'findings'
              ? 'bg-primary/15 text-primary shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-container'
          )}
          title="1-Click: Open Positive Findings Checklist"
        >
          <CheckSquare className="w-4 h-4 text-emerald-400" />
        </button>

        <span className="text-[10px] font-mono text-secondary rotate-90 whitespace-nowrap mt-12 tracking-wider uppercase font-semibold">
          {getCompanionTabLabel(activeTab)}
        </span>
      </div>
    </div>
  );
}
