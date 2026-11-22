'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Loader2, Database, ClipboardList } from 'lucide-react';
import { PacsSearchItem } from './pacs-search-item';
import { PacsSearchFilters } from './pacs-search-filters';
import type { PacsStudyResult } from '@/types/pacs';

interface PacsSearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectForPip?: (study: PacsStudyResult) => void;
  initialAssignedFilter?: 'all' | 'me';
}

export function PacsSearchModal({
  isOpen,
  onOpenChange,
  onSelectForPip,
  initialAssignedFilter,
}: PacsSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'me'>(initialAssignedFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'final'>('all');
  const [modality, setModality] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('all');
  const [source, setSource] = useState<'all' | 'local' | 'pacs' | 'gdrive' | 's3' | 'remote_node'>('all');
  const [studies, setStudies] = useState<PacsStudyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search on query/filters change
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      executeSearch();
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, query, dateRange, modality, source, statusFilter, assignedFilter]);

  // Sync initial assigned filter on open
  useEffect(() => {
    if (isOpen && initialAssignedFilter) {
      setAssignedFilter(initialAssignedFilter);
    }
  }, [isOpen, initialAssignedFilter]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global keyboard shortcuts (⌘K or ⌘⇧P to toggle, Esc to close, Arrow keys to navigate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.ctrlKey || e.metaKey;
      if (isCmd && (e.key.toLowerCase() === 'k' || (e.shiftKey && e.key.toLowerCase() === 'p'))) {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(studies.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter' && studies.length > 0 && selectedIndex >= 0 && selectedIndex < studies.length) {
        e.preventDefault();
        handleOpenStudy(studies[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange, studies, selectedIndex]);

  const executeSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pacs/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || undefined,
          modality: modality === 'all' ? undefined : modality,
          dateRange,
          source: source === 'all' ? undefined : source,
          status: statusFilter === 'all' ? undefined : statusFilter,
          assignedTo: assignedFilter === 'all' ? undefined : 'me',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStudies(data.studies || []);
        setSelectedIndex(0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStudy = async (study: PacsStudyResult) => {
    onOpenChange(false);
    if (!study.localCaseId || !study.isDownloaded) {
      try {
        await fetch('/api/pacs/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessionNumber: study.accessionNumber,
            studyInstanceUid: study.studyInstanceUid,
            patientName: study.patientName,
            source: study.source === 'pacs' ? 'hospital_pacs' : study.source || 'hospital_pacs',
          }),
        });
      } catch {}
    }
    router.push(`/workspace/${encodeURIComponent(study.localCaseId || study.accessionNumber)}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="w-full max-w-4xl bg-surface border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[84vh] animate-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-outline-variant/40 bg-surface-container/50 space-y-3">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h2 className="font-headline font-bold text-sm text-on-surface">Diagnostic Case Archive & PACS</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {studies.length} Studies
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/worklist?tab=my_cases"
                onClick={() => onOpenChange(false)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors border border-primary/25 cursor-pointer"
                title="Open HMIS Patients worklist filtered to your taken up cases"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Taken Up Worklist ↗</span>
              </Link>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modular Scope, Status, Query & Tier Filters */}
          <PacsSearchFilters
            query={query}
            setQuery={setQuery}
            assignedFilter={assignedFilter}
            setAssignedFilter={setAssignedFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            source={source}
            setSource={setSource}
            dateRange={dateRange}
            setDateRange={setDateRange}
            modality={modality}
            setModality={setModality}
            loading={loading}
            onSearch={executeSearch}
            inputRef={inputRef}
          />
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-secondary gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Querying cases and PACS archive...</span>
            </div>
          )}

          {!loading && studies.length === 0 && (
            <div className="py-12 text-center text-secondary text-xs">
              No matching studies found for the selected criteria.
            </div>
          )}

          {!loading && studies.map((s, idx) => (
            <div
              key={s.accessionNumber}
              className={`rounded-xl transition-all ${idx === selectedIndex ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''}`}
              onClick={() => setSelectedIndex(idx)}
            >
              <PacsSearchItem
                study={s}
                onOpen={handleOpenStudy}
                onSelectForPip={onSelectForPip ? (study) => { onSelectForPip(study); onOpenChange(false); } : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
