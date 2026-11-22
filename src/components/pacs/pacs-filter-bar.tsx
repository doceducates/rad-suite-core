'use client';

import React from 'react';
import { Search, Calendar, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PacsFilterBarProps {
  query: string;
  setQuery: (q: string) => void;
  modality: string;
  setModality: (m: string) => void;
  dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';
  setDateRange: (r: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom') => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
  source: 'all' | 'local' | 'pacs';
  setSource: (s: 'all' | 'local' | 'pacs') => void;
  loading: boolean;
  onSearch: () => void;
  onReset: () => void;
}

export function PacsFilterBar({
  query,
  setQuery,
  modality,
  setModality,
  dateRange,
  setDateRange,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  source,
  setSource,
  loading,
  onSearch,
  onReset,
}: PacsFilterBarProps) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} className="space-y-3">
      {/* Primary search inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-end">
        <div className="md:col-span-2">
          <label className="text-[10px] text-secondary font-medium block mb-1">Search Identifier / Patient</label>
          <div className="flex items-center bg-surface-container rounded-lg border border-outline-variant/60 px-2.5 py-1.5 focus-within:border-primary">
            <Search className="w-3.5 h-3.5 text-secondary mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Accession, patient name, MRN, or procedure..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-xs text-on-surface placeholder:text-secondary/60"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-secondary font-medium block mb-1">Modality</label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container text-on-surface text-xs font-medium"
          >
            <option value="all">All Modalities</option>
            <option value="CT">Computed Tomography (CT)</option>
            <option value="MRI">Magnetic Resonance (MRI / MR)</option>
            <option value="CR">Digital Radiography (CR / DX)</option>
            <option value="US">Ultrasound (US)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-secondary font-medium block mb-1">Archive Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as any)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container text-on-surface text-xs font-medium"
          >
            <option value="all">All Archives</option>
            <option value="local">Local Storage</option>
            <option value="pacs">Hospital PACS</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <Button type="submit" disabled={loading} className="flex-1 h-8 gap-1 text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            Search
          </Button>
          <button
            type="button"
            onClick={onReset}
            title="Reset Filters"
            className="h-8 px-2 rounded-lg border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Date preset chips & custom range */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/40">
          {(['all', 'today', 'yesterday', 'week', 'month', 'custom'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDateRange(r)}
              className={`px-2.5 py-0.5 rounded-md font-medium capitalize transition-all ${
                dateRange === r ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-secondary hover:text-on-surface'
              }`}
            >
              {r === 'all' ? 'All Dates' : r === 'week' ? 'Last 7 Days' : r === 'month' ? 'Last 30 Days' : r}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 p-1.5 rounded-lg border border-outline-variant/60 bg-surface-container text-xs">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-0.5 rounded border border-outline-variant/50 bg-surface-container-lowest text-xs"
            />
            <span className="text-secondary text-[10px]">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-0.5 rounded border border-outline-variant/50 bg-surface-container-lowest text-xs"
            />
          </div>
        )}
      </div>
    </form>
  );
}
