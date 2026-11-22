'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, UserCheck, ChevronDown, Check, RotateCcw } from 'lucide-react';

import {
  STORAGE_SOURCES,
  DATE_RANGES,
  MODALITIES,
  STATUS_OPTIONS,
  type PacsSearchFiltersProps,
} from './pacs-search-constants';

export { STORAGE_SOURCES, DATE_RANGES, MODALITIES, STATUS_OPTIONS };
export type { PacsSearchFiltersProps };


export function PacsSearchFilters({
  query,
  setQuery,
  assignedFilter,
  setAssignedFilter,
  statusFilter,
  setStatusFilter,
  source,
  setSource,
  dateRange,
  setDateRange,
  modality,
  setModality,
  loading,
  onSearch,
  inputRef,
}: PacsSearchFiltersProps) {
  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<'source' | 'modality' | 'date' | 'status' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  const activeSource = STORAGE_SOURCES.find((s) => s.id === source) || STORAGE_SOURCES[0];
  const activeModality =
    MODALITIES.find((m) => m.id.toUpperCase() === (modality || '').toUpperCase()) ||
    (modality?.toUpperCase() === 'MR' ? MODALITIES.find((m) => m.id === 'MRI') : undefined) ||
    MODALITIES[0];
  const activeDate = DATE_RANGES.find((d) => d.id === dateRange) || DATE_RANGES[0];
  const activeStatus = STATUS_OPTIONS.find((s) => s.id === statusFilter) || STATUS_OPTIONS[0];

  let filterCount = 0;
  if (query.trim()) filterCount++;
  if (assignedFilter !== 'all') filterCount++;
  if (source !== 'all') filterCount++;
  if (modality !== 'all') filterCount++;
  if (dateRange !== 'all') filterCount++;
  if (statusFilter !== 'all') filterCount++;

  const handleReset = () => {
    setQuery('');
    setAssignedFilter('all');
    setSource('all');
    setModality('all');
    setDateRange('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-2 text-xs font-sans" ref={containerRef}>
      {/* Row 1: Search Input + Mine Toggle + Search Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        className="flex items-center gap-2"
      >
        <div className="flex-1 flex items-center bg-surface-container-lowest rounded-xl border border-outline-variant/60 px-3 py-1.5 focus-within:border-primary transition-all shadow-2xs">
          <Search className="w-4 h-4 text-primary mr-2 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search patient name, MRN, accession, or study description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-xs text-on-surface placeholder:text-secondary/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-secondary hover:text-on-surface cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Scope Toggle: Taken Up (Mine) */}
        <button
          type="button"
          onClick={() => setAssignedFilter(assignedFilter === 'me' ? 'all' : 'me')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
            assignedFilter === 'me'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-surface-container border-outline-variant/60 text-secondary hover:text-on-surface hover:bg-surface-container-high'
          }`}
          title="Filter to my taken up (claimed) cases only"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Taken Up (Mine)</span>
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Search
        </button>
      </form>

      {/* Row 2: Streamlined Single-Bar Filter Dropdowns */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {/* Storage Source Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((prev) => (prev === 'source' ? null : 'source'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
                source !== 'all'
                  ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
                  : 'border-outline-variant/60 bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span>{activeSource.icon}</span>
              <span className="truncate max-w-[100px]">{activeSource.shortLabel}</span>
              <ChevronDown className="w-3 h-3 text-secondary ml-0.5" />
            </button>
            {openDropdown === 'source' && (
              <div className="absolute left-0 mt-1.5 w-48 p-1.5 bg-surface border border-outline-variant/60 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
                {STORAGE_SOURCES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSource(s.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                      source === s.id
                        ? 'bg-primary text-white font-bold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </span>
                    {source === s.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modality Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((prev) => (prev === 'modality' ? null : 'modality'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
                modality !== 'all'
                  ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
                  : 'border-outline-variant/60 bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span>{activeModality.icon}</span>
              <span className="truncate max-w-[90px]">{activeModality.shortLabel}</span>
              <ChevronDown className="w-3 h-3 text-secondary ml-0.5" />
            </button>
            {openDropdown === 'modality' && (
              <div className="absolute left-0 mt-1.5 w-52 p-1.5 bg-surface border border-outline-variant/60 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
                {MODALITIES.map((m) => {
                  const isSelected =
                    m.id.toUpperCase() === (modality || 'all').toUpperCase() ||
                    (m.id === 'all' && (!modality || modality === 'all'));
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModality(m.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                        isSelected
                          ? 'bg-primary text-white font-bold'
                          : 'hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </span>
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((prev) => (prev === 'date' ? null : 'date'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
                dateRange !== 'all'
                  ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
                  : 'border-outline-variant/60 bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span>{activeDate.icon}</span>
              <span className="truncate max-w-[90px]">{activeDate.shortLabel}</span>
              <ChevronDown className="w-3 h-3 text-secondary ml-0.5" />
            </button>
            {openDropdown === 'date' && (
              <div className="absolute left-0 mt-1.5 w-44 p-1.5 bg-surface border border-outline-variant/60 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
                {DATE_RANGES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDateRange(d.id);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                      dateRange === d.id
                        ? 'bg-primary text-white font-bold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{d.icon}</span>
                      <span>{d.label}</span>
                    </span>
                    {dateRange === d.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown((prev) => (prev === 'status' ? null : 'status'))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-2xs select-none ${
                statusFilter !== 'all'
                  ? 'border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/40'
                  : 'border-outline-variant/60 bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span>{activeStatus.icon}</span>
              <span className="truncate max-w-[90px]">{activeStatus.shortLabel}</span>
              <ChevronDown className="w-3 h-3 text-secondary ml-0.5" />
            </button>
            {openDropdown === 'status' && (
              <div className="absolute left-0 mt-1.5 w-48 p-1.5 bg-surface border border-outline-variant/60 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150">
                {STATUS_OPTIONS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st.id as any);
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left mb-0.5 last:mb-0 ${
                      statusFilter === st.id
                        ? 'bg-primary text-white font-bold'
                        : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{st.icon}</span>
                      <span>{st.label}</span>
                    </span>
                    {statusFilter === st.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reset button with active counter */}
        {filterCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] font-medium text-secondary hover:text-on-surface px-2 py-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer shrink-0"
            title="Reset modal filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              {filterCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
