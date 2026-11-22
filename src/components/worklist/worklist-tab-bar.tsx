'use client';

// Layer 4 (Presentation): HMIS Worklist Navigation Tab Bar (<130 lines)
import React from 'react';

export type WorklistTabType =
  | 'proceeded'
  | 'tracking'
  | 'published'
  | 'tat'
  | 'archive'
  // Legacy aliases for backward compatibility
  | 'all'
  | 'hmis'
  | 'unassigned'
  | 'discrepancy'
  | 'my_cases';

interface WorklistTabBarProps {
  tabFilter: WorklistTabType;
  onTabChange: (tab: WorklistTabType) => void;
  proceededCount?: number;
  unassignedCount?: number;
  trackingCount?: number;
  pendingAckCount?: number;
  archiveCount?: number;
  // Legacy props compatibility
  myCasesCount?: number;
  hmisCount?: number;
}

export function WorklistTabBar({
  tabFilter,
  onTabChange,
  proceededCount,
  unassignedCount,
  trackingCount,
  pendingAckCount = 0,
  archiveCount,
  hmisCount,
}: WorklistTabBarProps) {
  // Archive & Logbook merged into Reporting Queue; selecting or linking archive activates the main reporting queue with all-time cases
  const isProceededActive =
    tabFilter === 'proceeded' ||
    tabFilter === 'all' ||
    tabFilter === 'hmis' ||
    tabFilter === 'unassigned' ||
    tabFilter === 'archive';
  const effectiveProceededCount = proceededCount ?? hmisCount;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-outline-variant/60 pb-2">
      {/* 1. Reporting Queue & Archive Logbook (Consolidated) */}
      <button
        type="button"
        onClick={() => onTabChange('proceeded')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          isProceededActive
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-secondary hover:text-on-surface hover:bg-surface-container'
        }`}
      >
        <span>🏥 Reporting Queue</span>
        {typeof effectiveProceededCount === 'number' && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isProceededActive
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {effectiveProceededCount}
          </span>
        )}
      </button>

      {/* 2. Patient Tracking (Intake & Radiographer Ack Monitor) */}
      <button
        type="button"
        onClick={() => onTabChange('tracking')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          tabFilter === 'tracking'
            ? 'bg-primary text-white shadow-xs'
            : 'text-secondary hover:text-on-surface hover:bg-surface-container'
        }`}
      >
        <span>🛰️ Patient Tracking</span>
        {pendingAckCount > 0 ? (
          <span
            className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse"
            title={`${pendingAckCount} cases pending radiographer acknowledgment!`}
          >
            ⚠️ {pendingAckCount}
          </span>
        ) : typeof trackingCount === 'number' ? (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface-container-high text-secondary font-bold">
            {trackingCount}
          </span>
        ) : null}
      </button>

      {/* 3. Published Reports & Patient Priors Archive */}
      <button
        type="button"
        onClick={() => onTabChange('published')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          tabFilter === 'published'
            ? 'bg-primary text-white shadow-xs'
            : 'text-secondary hover:text-on-surface hover:bg-surface-container'
        }`}
      >
        <span>📜 Published &amp; Priors</span>
        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-primary/20 text-primary font-medium">
          All-Time
        </span>
      </button>

      {/* 4. Turnaround Time (TAT) Analytics */}
      <button
        type="button"
        onClick={() => onTabChange('tat')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          tabFilter === 'tat'
            ? 'bg-primary text-white shadow-xs'
            : 'text-secondary hover:text-on-surface hover:bg-surface-container'
        }`}
      >
        <span>⏱️ TAT Analytics</span>
      </button>
    </div>
  );
}
