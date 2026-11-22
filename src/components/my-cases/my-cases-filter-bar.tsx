'use client';

// Layer 4 (Presentation): My Cases Ultra-Compact Single-Bar Diagnostic Cockpit
// Strict File Size Invariant: Target < 250 lines

import React, { useRef, useEffect } from 'react';
import { Search, RefreshCw, X, RotateCcw, Plus, Zap, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangeDropdown } from '@/components/ui/date-range-dropdown';
import { WorklistModalityDropdown } from '@/components/worklist/worklist-modality-dropdown';
import { WorklistRegionDropdown } from '@/components/worklist/worklist-region-dropdown';
import { WorklistStatusDropdown } from '@/components/worklist/worklist-status-dropdown';
import { WorklistDeptDropdown } from '@/components/worklist/worklist-dept-dropdown';

export type ShiftDateRangeType = 'shift' | 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

interface MyCasesFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateRange: ShiftDateRangeType;
  onDateRangeChange: (range: ShiftDateRangeType) => void;
  customFrom: string;
  onCustomFromChange: (val: string) => void;
  customTo: string;
  onCustomToChange: (val: string) => void;
  modality: string;
  onModalityChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  priority: string;
  onPriorityChange: (val: string) => void;
  department: string;
  onDepartmentChange: (val: string) => void;
  bodyPart: string;
  onBodyPartChange: (val: string) => void;
  imagesReadyOnly: boolean;
  onToggleImagesReady: () => void;
  isFiltered: boolean;
  onResetFilters: () => void;
  loading: boolean;
  onRefresh: () => void;
  onOpenManualCaseModal?: () => void;
}

export function MyCasesFilterBar({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  modality,
  onModalityChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  department,
  onDepartmentChange,
  bodyPart,
  onBodyPartChange,
  imagesReadyOnly,
  onToggleImagesReady,
  isFiltered,
  onResetFilters,
  loading,
  onRefresh,
  onOpenManualCaseModal,
}: MyCasesFilterBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Pressing '/' anywhere focuses the search bar
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

  // Compute number of active filters for the reset badge
  let activeCount = 0;
  if (modality !== 'all') activeCount++;
  if (status !== 'all') activeCount++;
  if (priority !== 'all') activeCount++;
  if (department !== 'all') activeCount++;
  if (bodyPart !== 'all') activeCount++;
  if (dateRange !== 'shift' || customFrom || customTo) activeCount++;
  if (imagesReadyOnly) activeCount++;
  if (searchQuery.trim().length > 0) activeCount++;

  const isStatActive = priority === 'stat';

  return (
    <div className="text-xs font-sans">
      {/* Ultra-Compact Single-Bar Cockpit */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-2 rounded-xl border border-outline-variant/60 shadow-xs">
        {/* Core Filter Pipeline */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {/* 1. Quick Search with Shortcut Hint */}
          <div className="relative min-w-[160px] max-w-xs flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search cases... (/)"
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-secondary shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2.5 text-secondary hover:text-on-surface cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Modality Dropdown */}
          <WorklistModalityDropdown
            value={modality}
            onChange={onModalityChange}
          />

          {/* 3. Anatomical Region Dropdown */}
          <WorklistRegionDropdown
            value={bodyPart}
            onChange={onBodyPartChange}
          />

          {/* 4. Canonical Date Range Dropdown with Calendar Component */}
          <DateRangeDropdown
            value={dateRange}
            customFrom={customFrom}
            customTo={customTo}
            presets={[
              { id: 'shift', label: 'Last 48 Hours', shortLabel: '48h' },
              { id: 'today', label: 'Today Only', shortLabel: 'Today' },
              { id: 'yesterday', label: 'Yesterday', shortLabel: 'Yesterday' },
              { id: 'week', label: 'Past 7 Days', shortLabel: '7d' },
              { id: 'month', label: 'Past 30 Days', shortLabel: '30d' },
              { id: 'all', label: 'All Historical Dates', shortLabel: 'All' },
            ]}
            onChange={(preset, from, to) => {
              onDateRangeChange(preset as ShiftDateRangeType);
              onCustomFromChange(from || '');
              onCustomToChange(to || '');
            }}
          />

          {/* 5. Clinical Workflow Status Dropdown */}
          <WorklistStatusDropdown
            value={status}
            onChange={onStatusChange}
          />

          {/* 6. Hospital Department Dropdown */}
          <WorklistDeptDropdown
            value={department}
            onChange={onDepartmentChange}
          />

          {/* 7. Priority / STAT Emergency Toggle */}
          <button
            type="button"
            onClick={() => onPriorityChange(isStatActive ? 'all' : 'stat')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs select-none ${
              isStatActive
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 ring-1 ring-rose-500/50'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-container'
            }`}
            title="Show emergency STAT cases only"
          >
            <Zap className={`w-3.5 h-3.5 ${isStatActive ? 'animate-pulse text-rose-500 fill-rose-500' : ''}`} />
            <span>STAT</span>
          </button>

          {/* 8. Images Ready Toggle (Icon Only) */}
          <button
            type="button"
            onClick={onToggleImagesReady}
            className={`flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs select-none ${
              imagesReadyOnly
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/50'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-container'
            }`}
            title="Filter cases with downloaded DICOM images"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Create Manual Case Button */}
          {onOpenManualCaseModal && (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenManualCaseModal}
              title="Manually register a new patient & study"
              className="h-8 gap-1 text-xs font-bold shadow-xs cursor-pointer px-2 sm:px-2.5"
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
            disabled={loading}
            className="h-8 w-8 p-0 rounded-lg border-border text-muted-foreground hover:text-foreground hover:bg-surface-container shadow-2xs cursor-pointer flex items-center justify-center"
            title="Refresh My Cases list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>

          {/* Reset Filters Button with Superscript Active Count Badge */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              disabled={loading}
              title="Reset all filters"
              className="relative h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-container flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-primary text-on-primary text-[9px] flex items-center justify-center font-bold shadow-xs">
                  {activeCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
