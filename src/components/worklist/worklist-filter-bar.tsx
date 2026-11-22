'use client';

// Layer 4 (Presentation): Unified Diagnostic Filter Bar (<200 lines)
import React, { useState } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type AdvancedFilterValues } from './worklist-advanced-drawer';
import { WorklistMoreDropdown } from './worklist-more-dropdown';
import { DateRangeDropdown } from '@/components/ui/date-range-dropdown';
import { WorklistRegionDropdown } from './worklist-region-dropdown';
import { WorklistDeptDropdown } from './worklist-dept-dropdown';
import { WorklistStatusDropdown } from './worklist-status-dropdown';
import { WorklistModalityDropdown } from './worklist-modality-dropdown';

interface WorklistFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit?: (q: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  modalityFilter: string;
  onModalityChange: (modality: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  advancedFilters: AdvancedFilterValues;
  onAdvancedChange: (patch: Partial<AdvancedFilterValues>) => void;
  onReset: () => void;
  departmentFilter?: string;
  onDepartmentChange?: (dept: 'all' | 'er' | 'opd' | 'ward') => void;
  showFilmCharges?: boolean;
  onToggleShowFilmCharges?: (show: boolean) => void;
  filmChargesHiddenCount?: number;
  totalFilteredCount?: number;
  totalCount?: number;
  syncingHmis?: boolean;
}

export function WorklistFilterBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  statusFilter,
  onStatusChange,
  modalityFilter,
  onModalityChange,
  priorityFilter,
  onPriorityChange,
  advancedFilters,
  onAdvancedChange,
  onReset,
  departmentFilter = 'all',
  onDepartmentChange,
  showFilmCharges,
  onToggleShowFilmCharges,
  filmChargesHiddenCount = 0,
  totalFilteredCount,
  totalCount,
  syncingHmis = false,
}: WorklistFilterBarProps) {
  const isStatActive = priorityFilter === 'stat';

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 bg-card p-2 rounded-xl border border-outline-variant/60 shadow-xs text-xs font-sans">
      {/* 1. Core Filter Pipeline */}
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {/* Quick Search with Integrated Search Button */}
        <div className="relative min-w-[200px] max-w-sm flex-1 sm:flex-initial flex items-center">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-secondary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSearchSubmit?.(searchQuery);
              }
            }}
            placeholder="Search patient, MRN, accession..."
            className="w-full pl-8 pr-14 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-secondary shadow-2xs"
          />
          <div className="absolute right-1 top-1 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="p-1 text-secondary hover:text-on-surface cursor-pointer rounded"
                title="Clear"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onSearchSubmit?.(searchQuery)}
              disabled={syncingHmis}
              className="p-1.5 rounded-md bg-primary text-on-primary hover:bg-primary/90 cursor-pointer transition-colors shadow-2xs flex items-center justify-center disabled:opacity-50"
              title="Search local cases & HMIS portal (Enter)"
              aria-label="Search"
            >
              {syncingHmis ? (
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Modality Dropdown */}
        <WorklistModalityDropdown
          value={modalityFilter}
          onChange={onModalityChange}
        />

        {/* Anatomical Region Dropdown */}
        <WorklistRegionDropdown
          value={advancedFilters.bodyPart || 'all'}
          onChange={(part) => onAdvancedChange({ bodyPart: part })}
        />

        {/* Date Range Dropdown */}
        <DateRangeDropdown
          value={advancedFilters.dateRange || 'shift'}
          customFrom={advancedFilters.dateFrom}
          customTo={advancedFilters.dateTo}
          presets={[
            { id: 'shift', label: 'Last 48 Hours (Shift)', shortLabel: '48h Shift' },
            { id: 'today', label: 'Today Only', shortLabel: 'Today' },
            { id: 'yesterday', label: 'Yesterday', shortLabel: 'Yesterday' },
            { id: 'week', label: 'Past 7 Days', shortLabel: '7d' },
            { id: 'month', label: 'Past 30 Days', shortLabel: '30d' },
            { id: 'all', label: 'All Historical Dates', shortLabel: 'All Time' },
          ]}
          onChange={(preset, from, to) => {
            onAdvancedChange({
              dateRange: preset,
              dateFrom: from || '',
              dateTo: to || '',
            });
          }}
        />

        {/* Workflow Status Dropdown */}
        <WorklistStatusDropdown
          value={statusFilter}
          onChange={onStatusChange}
        />

        {/* Department Dropdown */}
        {onDepartmentChange && (
          <WorklistDeptDropdown
            value={departmentFilter || 'all'}
            onChange={onDepartmentChange}
          />
        )}

        {/* Billing / Film Charges Toggle */}
        {(filmChargesHiddenCount > 0 || showFilmCharges) && onToggleShowFilmCharges && (
          <button
            type="button"
            onClick={() => onToggleShowFilmCharges(!showFilmCharges)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs select-none ${
              showFilmCharges
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 ring-1 ring-amber-500/40'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-container'
            }`}
            title={showFilmCharges ? 'Hide billing orders' : `Show ${filmChargesHiddenCount} hidden billing items`}
          >
            <span>🧾</span>
            <span className="hidden sm:inline">{showFilmCharges ? 'Hide Bill' : `Bill (${filmChargesHiddenCount})`}</span>
          </button>
        )}

        {/* More Filters Dropdown with Submenus */}
        <WorklistMoreDropdown
          filters={advancedFilters}
          onChange={onAdvancedChange}
          align="right"
        />
      </div>

      {/* 2. Inline Summary & Reset Button */}
      <div className="flex items-center gap-2 shrink-0 ml-auto text-[11px] text-secondary">
        {typeof totalFilteredCount === 'number' && typeof totalCount === 'number' && (
          <span className="hidden sm:inline font-medium">
            Showing <strong className="text-foreground">{totalFilteredCount}</strong> of{' '}
            <strong className="text-foreground">{totalCount}</strong>
          </span>
        )}

        <button
          type="button"
          onClick={onReset}
          className="p-1.5 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface cursor-pointer transition-colors"
          title="Reset all filters to default"
          aria-label="Reset filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
