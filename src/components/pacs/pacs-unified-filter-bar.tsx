'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X, RotateCcw, FolderOpen, UploadCloud, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangeDropdown, DEFAULT_DATE_PRESETS } from '@/components/ui/date-range-dropdown';
import { WorklistModalityDropdown } from '@/components/worklist/worklist-modality-dropdown';
import { WorklistRegionDropdown } from '@/components/worklist/worklist-region-dropdown';
import { PacsScopeDropdown, type PacsSearchFieldScope } from './pacs-scope-dropdown';

export interface PacsFilterValues {
  search: string;
  searchField: PacsSearchFieldScope;
  modality: string;
  region: string;
  datePreset: '48h' | 'today' | 'yesterday' | '7d' | '30d' | 'all' | 'custom';
  customFrom?: string;
  customTo?: string;
  location: string;
}

interface PacsUnifiedFilterBarProps {
  filters: PacsFilterValues;
  onChange: (patch: Partial<PacsFilterValues>) => void;
  onSearch: () => void;
  onReset: () => void;
  onOpenImportFolder?: () => void;
  onOpenUploadCase?: () => void;
  onOpenPacsServers?: () => void;
  allowedSources?: string[];
  isAdmin?: boolean;
  loading?: boolean;
  totalIndexedCount?: number;
}

export function PacsUnifiedFilterBar({
  filters,
  onChange,
  onSearch,
  onReset,
  onOpenImportFolder,
  onOpenUploadCase,
  onOpenPacsServers,
  allowedSources,
  isAdmin = false,
  loading = false,
  totalIndexedCount = 0,
}: PacsUnifiedFilterBarProps) {
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

  const handleDateChange = (preset: string, customFrom?: string, customTo?: string) => {
    onChange({
      datePreset: preset as PacsFilterValues['datePreset'],
      customFrom,
      customTo,
    });
  };

  // Count active non-default filters
  let activeFilterCount = 0;
  if (filters.search && filters.search.trim()) activeFilterCount++;
  if (filters.searchField && filters.searchField !== 'all') activeFilterCount++;
  if (filters.location && filters.location !== 'all') activeFilterCount++;
  if (filters.modality && filters.modality !== 'all') activeFilterCount++;
  if (filters.region && filters.region !== 'all') activeFilterCount++;
  if (filters.datePreset && filters.datePreset !== '48h') activeFilterCount++;

  const isFiltered = activeFilterCount > 0;

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-card p-2 rounded-xl border border-border/80 shadow-xs text-xs font-sans">
      {/* Primary Cockpit Controls */}
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {/* Quick Search with Instant Clear & Hotkey */}
        <div className="relative min-w-[200px] flex-1 max-w-sm sm:max-w-md">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Search accession, MRN, patient name, description... (Press '/' to focus)"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground shadow-2xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => {
                onChange({ search: '' });
                onSearch();
              }}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear search text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Field Scope Selector */}
        <PacsScopeDropdown
          value={filters.searchField}
          onChange={(scope) => onChange({ searchField: scope })}
        />

        {/* Imaging Modality Dropdown */}
        <WorklistModalityDropdown
          value={filters.modality}
          onChange={(mod) => onChange({ modality: mod })}
        />

        {/* Anatomical Body Region Dropdown */}
        <WorklistRegionDropdown
          value={filters.region}
          onChange={(reg) => onChange({ region: reg })}
        />

        {/* Date Shift / Rolling Window Dropdown */}
        <DateRangeDropdown
          value={filters.datePreset}
          onChange={handleDateChange}
          customFrom={filters.customFrom}
          customTo={filters.customTo}
          presets={DEFAULT_DATE_PRESETS}
        />

        {/* Execute Search Button */}
        <Button
          size="sm"
          onClick={onSearch}
          disabled={loading}
          className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 cursor-pointer shrink-0"
        >
          <Search className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Search</span>
        </Button>

        {/* Clear / Reset Filters with active count badge */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
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

        {/* Import Folder Button */}
        {onOpenImportFolder && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenImportFolder}
            className="h-8 gap-1.5 text-xs border-primary/40 hover:bg-primary/10 text-primary px-2.5 cursor-pointer shrink-0 font-medium"
            title="Import local DICOM folder or scan drive"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Import Folder</span>
          </Button>
        )}

        {/* Upload DICOM / ZIP Case Button */}
        {onOpenUploadCase && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenUploadCase}
            className="h-8 gap-1.5 text-xs border-primary/40 hover:bg-primary/10 text-primary px-2.5 cursor-pointer shrink-0 font-medium"
            title="Upload DICOM ZIP archive or series folder directly"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Case</span>
          </Button>
        )}

        {/* PACS Servers Configuration Modal Trigger */}
        {onOpenPacsServers && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenPacsServers}
            className="h-8 gap-1.5 text-xs border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 cursor-pointer shrink-0 font-medium"
            title="Configure and test PACS server connections"
          >
            <Server className="w-3.5 h-3.5" />
            <span>PACS Servers</span>
          </Button>
        )}
      </div>

      {/* Right: Study Count & Archive Indicator */}
      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
        <span className="text-[11px] font-mono text-muted-foreground">
          {loading ? (
            <span className="animate-pulse">Querying PACS...</span>
          ) : (
            <span>{totalIndexedCount.toLocaleString()} studies indexed</span>
          )}
        </span>
      </div>
    </div>
  );
}
