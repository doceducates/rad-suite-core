'use client';

import React from 'react';
import { FileEdit, Sparkles } from 'lucide-react';
import { ReportingMode } from '@/hooks/use-reporting-layout';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface ZenReportingFabProps {
  onSelectMode: (mode: ReportingMode) => void;
  onTranscript?: (text: string, action?: string) => void;
  status?: string;
}

export function ZenReportingFab({ onSelectMode, status = 'draft' }: ZenReportingFabProps) {
  const isMobile = useIsMobile();

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 sm:bottom-6 sm:right-6 z-40 select-none animate-in fade-in zoom-in-75 duration-200">
      <button
        type="button"
        onClick={() => onSelectMode(isMobile ? 'modal' : 'split')}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-2xl ring-4 ring-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Open Reporting & AI Suite (Report, DDx, Chat, Pearls) — Alt+2"
        aria-label="Open Diagnostic Reporting & AI Suite"
      >
        <FileEdit className="w-6 h-6 transition-transform group-hover:scale-110" />

        {/* Subtle AI Sparkle accent */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs border-2 border-surface">
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </span>

        {/* Hover Tooltip Pill */}
        <span className="absolute right-full mr-3 px-2.5 py-1 rounded-xl bg-surface-container-highest/95 backdrop-blur-md border border-outline-variant/80 text-[11px] font-semibold text-on-surface whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
          Open Reporting & AI Suite ({status})
        </span>
      </button>
    </div>
  );
}
