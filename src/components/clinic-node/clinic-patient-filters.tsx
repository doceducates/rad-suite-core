'use client';

import React from 'react';
import { Search, UploadCloud, DownloadCloud, Radio, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangeDropdown, type DateRangePreset } from '@/components/ui/date-range-dropdown';

const CLINIC_DATE_PRESETS: DateRangePreset[] = [
  { id: 'all', label: 'All Dates', shortLabel: 'All Dates' },
  { id: 'today', label: "Today's Scans", shortLabel: 'Today' },
  { id: 'yesterday', label: "Yesterday's Scans", shortLabel: 'Yesterday' },
  { id: '48h', label: 'Last 48 Hours', shortLabel: '48h' },
  { id: '7d', label: 'Past 7 Days', shortLabel: '7d' },
];

interface ClinicPatientFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  modality: string;
  setModality: (val: string) => void;
  datePreset: string;
  customFrom?: string;
  customTo?: string;
  onDateChange: (preset: string, customFrom?: string, customTo?: string) => void;
  stageFilter: 'all' | 'sandbox' | 's3' | 'pacs';
  setStageFilter: (val: 'all' | 'sandbox' | 's3' | 'pacs') => void;
  pullAccInput: string;
  setPullAccInput: (val: string) => void;
  isPulling: boolean;
  onPullStudy: (acc: string) => void;
  onQueryScanner: () => void;
  loading: boolean;
  isQueryingScanner: boolean;
  unsyncedCount: number;
  onSyncAll: () => void;
  syncingAll: boolean;
}

export function ClinicPatientFilters({
  search,
  setSearch,
  modality,
  setModality,
  datePreset,
  customFrom,
  customTo,
  onDateChange,
  stageFilter,
  setStageFilter,
  pullAccInput,
  setPullAccInput,
  isPulling,
  onPullStudy,
  onQueryScanner,
  loading,
  isQueryingScanner,
  unsyncedCount,
  onSyncAll,
  syncingAll,
}: ClinicPatientFiltersProps) {
  return (
    <div className="p-3 rounded-2xl border border-border/70 bg-card shadow-xs space-y-2.5">
      {/* Primary Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input with clear */}
        <div className="relative min-w-[200px] flex-1 max-w-sm sm:max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onQueryScanner()}
            placeholder="Search patient name, MRN, accession..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground shadow-2xs h-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Query Scanner Button */}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onQueryScanner}
          disabled={isQueryingScanner || loading}
          className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer shadow-2xs shrink-0"
          title="Query Hospital PACS scanner live for newly acquired CT/MR scans"
        >
          <Radio className={`w-3.5 h-3.5 text-primary ${isQueryingScanner ? 'animate-pulse' : ''}`} />
          <span>{isQueryingScanner ? 'Querying...' : 'Query Scanner'}</span>
        </Button>

        {/* Modality Selector */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl border border-border bg-muted/40 h-8">
          {['ALL', 'MR', 'CT'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModality(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                modality === m
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Smart Date Range Dropdown with Responsive Modal Calendar */}
        <DateRangeDropdown
          value={datePreset}
          onChange={onDateChange}
          customFrom={customFrom}
          customTo={customTo}
          presets={CLINIC_DATE_PRESETS}
          className="shrink-0"
        />

        {/* Storage Stage Dropdown */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as any)}
          className="px-2.5 py-1 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer h-8"
        >
          <option value="all">All Storage Stages</option>
          <option value="sandbox">In Sandbox (Disk)</option>
          <option value="s3">Synced to Cloud</option>
          <option value="pacs">On PACS Scanner Only</option>
        </select>

        {/* Batch Sync to Cloud button (when unsynced cases exist) */}
        {unsyncedCount > 0 && (
          <Button
            size="sm"
            onClick={onSyncAll}
            disabled={syncingAll || loading}
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shrink-0 ml-auto"
            title="Upload all resident sandbox studies to Rad Suite Cloud VPS"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${syncingAll ? 'animate-bounce' : ''}`} />
            <span>{syncingAll ? 'Syncing...' : `Upload All to Cloud (${unsyncedCount})`}</span>
          </Button>
        )}
      </div>

      {/* Targeted On-Demand Scanner Pull Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pullAccInput.trim()) onPullStudy(pullAccInput.trim());
        }}
        className="flex items-center gap-2 pt-1 border-t border-border/60"
      >
        <input
          type="text"
          value={pullAccInput}
          onChange={(e) => setPullAccInput(e.target.value)}
          placeholder="On-demand pull: enter accession number from CT/MR scanner (e.g. 2609012345)..."
          className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground h-8"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!pullAccInput.trim() || isPulling}
          className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer px-3"
        >
          <DownloadCloud className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce' : ''}`} />
          <span>Pull to Sandbox</span>
        </Button>
      </form>
    </div>
  );
}
