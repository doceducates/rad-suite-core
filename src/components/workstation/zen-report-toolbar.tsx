'use client';

import React from 'react';
import { FileText, MessageSquareShare } from 'lucide-react';

export type ReportingTab = 'standard' | 'discussion';

interface ZenReportToolbarProps {
  reportingTab?: ReportingTab;
  onSelectReportingTab?: (tab: ReportingTab) => void;
}

export function ZenReportToolbar({
  reportingTab = 'standard',
  onSelectReportingTab,
}: ZenReportToolbarProps) {
  if (!onSelectReportingTab) return null;

  return (
    <div className="sticky top-0 z-20 w-full py-1.5 bg-surface/90 backdrop-blur-md flex items-center justify-center border-b border-outline-variant/20 shadow-2xs select-none">
      <div className="flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant/60 shadow-xs">
        <button
          type="button"
          onClick={() => onSelectReportingTab('standard')}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            reportingTab === 'standard'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
          title="Standard Structured Diagnostic Report View"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Report</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectReportingTab('discussion')}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            reportingTab === 'discussion'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
              : 'text-secondary hover:text-on-surface'
          }`}
          title="Consultant Case Discussion & Quick Changes (Alt+C)"
        >
          <MessageSquareShare className="w-3.5 h-3.5" />
          <span>Discuss</span>
        </button>
      </div>
    </div>
  );
}
