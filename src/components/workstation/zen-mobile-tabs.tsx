'use client';

import React from 'react';
import { FileText, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ZenMobileView = 'report' | 'images' | 'copilot';

interface ZenMobileTabsProps {
  activeView: ZenMobileView;
  onSelectView: (view: ZenMobileView) => void;
  seriesName?: string;
  hasCriticalFinding?: boolean;
}

export function ZenMobileTabs({
  activeView,
  onSelectView,
  seriesName,
  hasCriticalFinding,
}: ZenMobileTabsProps) {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-surface-container/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 select-none shadow-lg"
    >
      {/* 1. Report Editor View */}
      <button
        type="button"
        onClick={() => onSelectView('report')}
        className={cn(
          'flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all',
          activeView === 'report'
            ? 'text-primary font-bold'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <div className="relative">
          <FileText className="w-5 h-5" />
          {hasCriticalFinding && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-error animate-pulse" />
          )}
        </div>
        <span className="text-[10px] mt-0.5">Report</span>
      </button>

      {/* 2. Image Series / PACS View */}
      <button
        type="button"
        onClick={() => onSelectView('images')}
        className={cn(
          'flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all',
          activeView === 'images'
            ? 'text-primary font-bold'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <div className="relative">
          <Layers className="w-5 h-5" />
          <span className="absolute -bottom-0.5 -right-1 text-[8px] font-mono font-bold text-primary">
            DICOM
          </span>
        </div>
        <span className="text-[10px] mt-0.5 truncate max-w-[90px]">
          {seriesName ? 'Series' : 'Images'}
        </span>
      </button>

      {/* 3. AI Copilot / DDx View */}
      <button
        type="button"
        onClick={() => onSelectView('copilot')}
        className={cn(
          'flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all',
          activeView === 'copilot'
            ? 'text-primary font-bold'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <div className="relative">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <span className="text-[10px] mt-0.5">AI Copilot</span>
      </button>
    </nav>
  );
}
