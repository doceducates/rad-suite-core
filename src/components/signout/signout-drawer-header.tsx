'use client';

import React from 'react';
import { Stethoscope, X, PanelRight, Maximize2, Filter, FileText } from 'lucide-react';

interface SignoutDrawerHeaderProps {
  templateTitle: string;
  layoutMode: 'dock' | 'modal';
  onToggleLayoutMode: () => void;
  activeTab: 'positive' | 'formatted';
  onChangeTab: (tab: 'positive' | 'formatted') => void;
  positiveCount: number;
  totalSections: number;
  onClose: () => void;
  isMobile?: boolean;
}

export function SignoutDrawerHeader({
  templateTitle,
  layoutMode,
  onToggleLayoutMode,
  activeTab,
  onChangeTab,
  positiveCount,
  totalSections,
  onClose,
  isMobile = false,
}: SignoutDrawerHeaderProps) {
  return (
    <div className="px-4 py-2.5 border-b border-outline-variant/40 bg-surface-container-low flex items-center justify-between gap-2.5 shrink-0 select-none">
      {/* Left: Branding & Region */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
          <Stethoscope className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-xs sm:text-sm text-on-surface truncate">
              Sign-Out Rounds
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container border border-outline-variant/40 text-secondary truncate max-w-[160px] sm:max-w-none">
              {templateTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Tab Selector (Positive vs Full) */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-container border border-outline-variant/40 text-[11px]">
        <button
          type="button"
          onClick={() => onChangeTab('positive')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
            activeTab === 'positive'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
          title="Show only positive/abnormal findings"
        >
          <Filter className="w-3 h-3" />
          <span>Positives ({positiveCount})</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeTab('formatted')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
            activeTab === 'formatted'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
          title="Show full template sections"
        >
          <FileText className="w-3 h-3" />
          <span className="hidden sm:inline">All ({totalSections})</span>
        </button>
      </div>

      {/* Right Controls: Dock/Modal Toggle & Close */}
      <div className="flex items-center gap-1 shrink-0">
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleLayoutMode}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 cursor-pointer transition-colors"
            title={layoutMode === 'dock' ? 'Expand to Full Center Modal' : 'Dock to Right Side (Keep DICOM Images Visible)'}
          >
            {layoutMode === 'dock' ? <Maximize2 className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          title="Close Sign-Out Workspace (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
