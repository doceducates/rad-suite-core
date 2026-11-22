'use client';

import React, { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search, X, RotateCcw } from 'lucide-react';
import { WorklistModalityDropdown } from '@/components/worklist/worklist-modality-dropdown';
import { WorklistStatusDropdown } from '@/components/worklist/worklist-status-dropdown';
import { DateRangeDropdown, DEFAULT_DATE_PRESETS } from '@/components/ui/date-range-dropdown';

export type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom';

interface PatientRecordsFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (p: DatePreset) => void;
  customFrom: string;
  onCustomFromChange: (v: string) => void;
  customTo: string;
  onCustomToChange: (v: string) => void;
  modalityFilter: string;
  onModalityFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  stats: {
    total: number;
    final: number;
    draft: number;
    ct: number;
    mri: number;
  };
}

export function PatientRecordsFilters({
  search,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  modalityFilter,
  onModalityFilterChange,
  statusFilter,
  onStatusFilterChange,
  stats,
}: PatientRecordsFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global hotkey '/' to quickly jump to search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDateChange = (preset: string, from?: string, to?: string) => {
    onDatePresetChange(preset as DatePreset);
    if (from !== undefined) onCustomFromChange(from);
    if (to !== undefined) onCustomToChange(to);
  };

  // Count active non-default filters
  let activeFilterCount = 0;
  if (search.trim()) activeFilterCount++;
  if (modalityFilter && modalityFilter.toLowerCase() !== 'all') activeFilterCount++;
  if (statusFilter && statusFilter.toLowerCase() !== 'all') activeFilterCount++;
  if (datePreset && datePreset !== 'all') activeFilterCount++;

  const handleReset = () => {
    onSearchChange('');
    onModalityFilterChange('all');
    onStatusFilterChange('all');
    onDatePresetChange('all');
    onCustomFromChange('');
    onCustomToChange('');
  };

  return (
    <div className="space-y-2.5 text-xs font-sans">
      {/* Quick Clinical Metrics / Triage Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-xs">
            {stats.total} Studies
          </Badge>
          <Badge variant="success" className="font-mono text-xs">
            {stats.final} Finalized
          </Badge>
          <Badge variant="warning" className="font-mono text-xs">
            {stats.draft} Pending
          </Badge>
          {stats.ct > 0 && (
            <Badge className="bg-primary/10 text-primary border border-primary/30 font-mono text-xs">
              {stats.ct} CT
            </Badge>
          )}
          {stats.mri > 0 && (
            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-mono text-xs">
              {stats.mri} MRI
            </Badge>
          )}
        </div>
      </div>

      {/* Streamlined Single-Bar Cockpit */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-card p-2 rounded-xl border border-border/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {/* Quick Search with Clear & Hotkey */}
          <div className="relative min-w-[200px] flex-1 max-w-sm sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search patient name, MRN, accession... (Press '/')"
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Modality Dropdown */}
          <WorklistModalityDropdown
            value={modalityFilter}
            onChange={onModalityFilterChange}
          />

          {/* Date Shift / Range Dropdown */}
          <DateRangeDropdown
            value={datePreset}
            onChange={handleDateChange}
            customFrom={customFrom}
            customTo={customTo}
            presets={DEFAULT_DATE_PRESETS}
          />

          {/* Status Dropdown */}
          <WorklistStatusDropdown
            value={statusFilter}
            onChange={onStatusFilterChange}
          />

          {/* Clear / Reset Filter Button */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer shrink-0"
              title="Reset all filters to default"
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
    </div>
  );
}
