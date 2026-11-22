'use client';

// Layer 4 (Presentation): My Cases Responsive Header with Interactive Audit Pills & Targeted Tracking (<180 lines)
import React from 'react';
import { Radar, RefreshCw, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MyCasesCockpitHeaderProps {
  totalCount: number;
  filteredCount: number;
  selectedCount?: number;
  prelimCount: number;
  submittedCount: number;
  publishedCount: number;
  statCount: number;
  activeStatus: string;
  onStatusChange: (status: string) => void;
  activePriority: string;
  onPriorityChange: (priority: string) => void;
  syncingMyStatus: boolean;
  onTrackStatus: () => void;
  onRefresh: () => void;
  onOpenManualCaseModal?: () => void;
}

export function MyCasesCockpitHeader({
  totalCount,
  filteredCount,
  selectedCount = 0,
  prelimCount,
  submittedCount,
  publishedCount,
  statCount,
  activeStatus,
  onStatusChange,
  activePriority,
  onPriorityChange,
  syncingMyStatus,
  onTrackStatus,
  onRefresh,
  onOpenManualCaseModal,
}: MyCasesCockpitHeaderProps) {
  const isAllActive = activeStatus === 'all' && activePriority !== 'stat';
  const isPrelimActive = activeStatus === 'preliminary' || activeStatus === 'draft';
  const isSubmittedActive = activeStatus === 'submitted';
  const isPublishedActive = activeStatus === 'final' || activeStatus === 'finalized';
  const isStatActive = activePriority === 'stat';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-outline-variant/60 text-xs font-sans">
      {/* 1. Left Cluster: Title & Interactive Status Audit Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
        <h1 className="text-base font-bold tracking-tight text-on-surface font-headline mr-1 whitespace-nowrap">
          My Cases
        </h1>

        {/* Pill 1: All Cases */}
        <button
          type="button"
          onClick={() => {
            onStatusChange('all');
            onPriorityChange('all');
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
            isAllActive
              ? 'bg-primary text-white shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
          title="Show all your assigned cases"
        >
          <span>All</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isAllActive ? 'bg-white/20 text-white' : 'bg-surface-container-high text-secondary'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* Pill 2: Prelim Reports */}
        <button
          type="button"
          onClick={() => {
            onStatusChange(isPrelimActive ? 'all' : 'preliminary');
            if (activePriority === 'stat') onPriorityChange('all');
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
            isPrelimActive
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
          title="Filter cases with provisional preliminary findings"
        >
          <span>🎙️ Prelims</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isPrelimActive ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}
          >
            {prelimCount}
          </span>
        </button>

        {/* Pill 3: Submitted / Awaiting Consultant Sign-Off */}
        <button
          type="button"
          onClick={() => {
            onStatusChange(isSubmittedActive ? 'all' : 'submitted');
            if (activePriority === 'stat') onPriorityChange('all');
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
            isSubmittedActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
          title="Filter submitted cases awaiting consultant verification and publishing"
        >
          <span>📤 Submitted</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isSubmittedActive ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
            }`}
          >
            {submittedCount}
          </span>
        </button>

        {/* Pill 4: Published & Finalized */}
        <button
          type="button"
          onClick={() => {
            onStatusChange(isPublishedActive ? 'all' : 'final');
            if (activePriority === 'stat') onPriorityChange('all');
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
            isPublishedActive
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
          title="Filter finalized and published cases"
        >
          <span>✅ Published</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isPublishedActive ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {publishedCount}
          </span>
        </button>

        {/* Pill 5: Emergency STAT Cases */}
        {statCount > 0 && (
          <button
            type="button"
            onClick={() => onPriorityChange(isStatActive ? 'all' : 'stat')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer select-none ${
              isStatActive
                ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-500/50'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
            }`}
            title="Show urgent STAT cases"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>STAT</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {statCount}
            </span>
          </button>
        )}
      </div>

      {/* 2. Right Cluster: Targeted Track Status Action & Controls */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {/* Targeted Track Status Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onTrackStatus}
          disabled={syncingMyStatus}
          title={
            selectedCount > 0
              ? `Query HMIS tracking for ${selectedCount} selected case(s)`
              : `Query HMIS tracking for all ${filteredCount} displayed cases`
          }
          className="h-8 px-2.5 gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs font-semibold"
        >
          {syncingMyStatus ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying ({selectedCount > 0 ? selectedCount : filteredCount})...</span>
            </>
          ) : (
            <>
              <Radar className="w-3.5 h-3.5 text-primary" />
              <span>
                {selectedCount > 0
                  ? `Track Them (${selectedCount})`
                  : filteredCount > 0
                  ? `Track Status (${filteredCount})`
                  : 'Track Status'}
              </span>
            </>
          )}
        </Button>

        {/* Manual Case Button */}
        {onOpenManualCaseModal && (
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenManualCaseModal}
            title="Register a new standalone patient study"
            className="h-8 px-2.5 gap-1 text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Case</span>
          </Button>
        )}

        {/* Refresh Cases Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={syncingMyStatus}
          className="h-8 w-8 p-0 rounded-lg border-border text-muted-foreground hover:text-foreground hover:bg-surface-container shadow-2xs cursor-pointer flex items-center justify-center"
          title="Refresh My Cases list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingMyStatus ? 'animate-spin text-primary' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
