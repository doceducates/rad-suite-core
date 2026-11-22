'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorklistModalityDropdown } from '@/components/worklist/worklist-modality-dropdown';
import { WorklistRegionDropdown } from '@/components/worklist/worklist-region-dropdown';
import { DateRangeDropdown, DEFAULT_DATE_PRESETS } from '@/components/ui/date-range-dropdown';
import { WorklistStatusDropdown } from '@/components/worklist/worklist-status-dropdown';
import { StandbySourceDropdown } from './standby-source-dropdown';
import type { StandbySourceTab } from './standby-types';

export interface StandbyFilterBarProps {
  scope?: 'mine' | 'all' | 'unassigned';
  setScope?: (s: 'mine' | 'all' | 'unassigned') => void;
  source: StandbySourceTab;
  setSource: (s: StandbySourceTab) => void;
  allowedSources?: string[];
  isAdmin?: boolean;
  counts?: Partial<Record<StandbySourceTab, number>>;
  query: string;
  setQuery: (q: string) => void;
  modality: string;
  setModality: (m: string) => void;
  region: string;
  setRegion: (r: string) => void;
  dateRange: string;
  setDateRange: (d: string) => void;
  customFrom?: string;
  setCustomFrom: (from: string) => void;
  customTo?: string;
  setCustomTo: (to: string) => void;
  status: string;
  setStatus: (s: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function StandbyFilterBar({
  scope = 'mine',
  setScope,
  source,
  setSource,
  allowedSources,
  isAdmin,
  counts,
  query,
  setQuery,
  modality,
  setModality,
  region,
  setRegion,
  dateRange,
  setDateRange,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  status,
  setStatus,
  loading,
  onRefresh,
  onReset,
  activeFilterCount,
}: StandbyFilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDateChange = (preset: string, from?: string, to?: string) => {
    setDateRange(preset);
    if (from !== undefined) setCustomFrom(from);
    if (to !== undefined) setCustomTo(to);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-xl bg-surface-container/60 border border-outline-variant/50 shadow-xs text-xs font-sans">
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {/* Quick Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-secondary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search patient name, MRN, accession... (Press '/')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-on-surface text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-secondary/60 shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-2.5 text-secondary hover:text-on-surface cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Workspace Scope Segmented Toggle */}
        {setScope && (
          <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-container-high/80 border border-outline-variant/60 shrink-0">
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                scope === 'mine'
                  ? 'bg-primary text-white shadow-2xs font-semibold'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              }`}
              title="Show only cases assigned to your workspace"
            >
              My Cases
            </button>
            <button
              type="button"
              onClick={() => setScope('unassigned')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                scope === 'unassigned'
                  ? 'bg-primary text-white shadow-2xs font-semibold'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              }`}
              title="Show unassigned cases ready to claim"
            >
              Unassigned
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                scope === 'all'
                  ? 'bg-primary text-white shadow-2xs font-semibold'
                  : 'text-secondary hover:text-on-surface hover:bg-surface-container'
              }`}
              title="Show all cases across worklist"
            >
              All
            </button>
          </div>
        )}

        {/* Storage / PACS Source Dropdown */}
        <StandbySourceDropdown
          value={source}
          onChange={setSource}
          allowedSources={allowedSources}
          isAdmin={isAdmin}
          counts={counts}
        />

        {/* Modality Dropdown */}
        <WorklistModalityDropdown value={modality} onChange={setModality} />

        {/* Region Dropdown */}
        <WorklistRegionDropdown value={region} onChange={setRegion} />

        {/* Date Shift / Range Dropdown */}
        <DateRangeDropdown
          value={dateRange}
          onChange={handleDateChange}
          customFrom={customFrom}
          customTo={customTo}
          presets={DEFAULT_DATE_PRESETS}
        />

        {/* Status Dropdown */}
        <WorklistStatusDropdown value={status} onChange={setStatus} />

        {/* Refresh Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-8 px-2.5 text-secondary hover:text-on-surface hover:bg-surface-container-high rounded-lg cursor-pointer shrink-0"
          title="Refresh cases from active source"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        {/* Reset Filter Button */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-medium text-secondary hover:text-on-surface px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
