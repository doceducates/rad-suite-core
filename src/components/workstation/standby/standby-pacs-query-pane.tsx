'use client';

import React, { useState } from 'react';
import { Search, Server, Loader2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StandbyCaseCard } from './standby-case-card';
import type { PacsStudyResult } from '@/types/pacs';

export function StandbyPacsQueryPane() {
  const [accession, setAccession] = useState('');
  const [mrn, setMrn] = useState('');
  const [patientName, setPatientName] = useState('');
  const [modality, setModality] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<PacsStudyResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch('/api/pacs/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'pacs',
          accessionNumber: accession.trim() || undefined,
          patientMrn: mrn.trim() || undefined,
          patientName: patientName.trim() || undefined,
          modality: modality === 'all' ? undefined : modality,
          dateRange,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.studies || []);
      } else {
        setError(data.error || 'Failed to query PACS archive');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error querying PACS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4 text-left">
      {/* PACS Server Diagnostic Header */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <span className="font-bold text-on-surface">Hospital PACS DIMSE Query Engine</span>
            <span className="text-secondary ml-2 font-mono text-[11px]">(Hospital Archive DIMSE)</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Calling AET: RADIANT</span>
        </div>
      </div>

      {/* Query Form */}
      <form onSubmit={handleQuery} className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant/40 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-mono text-secondary mb-1">Accession #</label>
            <input
              type="text"
              placeholder="e.g. 192609005798"
              value={accession}
              onChange={(e) => setAccession(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-secondary mb-1">Patient MRN / ID</label>
            <input
              type="text"
              placeholder="e.g. 19202653374198"
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-secondary mb-1">Patient Name</label>
            <input
              type="text"
              placeholder="e.g. ALTAJAR"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Modality Chips */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-secondary mr-1">Modality:</span>
            {['all', 'CT', 'MR', 'CR', 'US'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModality(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  modality === m
                    ? 'bg-primary text-white'
                    : 'bg-surface-container text-secondary hover:text-on-surface'
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Date Range Chips */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-secondary mr-1">Date:</span>
            {(['today', 'yesterday', 'week', 'month', 'all'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDateRange(d)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer capitalize transition-colors ${
                  dateRange === d
                    ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400 font-bold border border-blue-500/40'
                    : 'bg-surface-container text-secondary hover:text-on-surface'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-1.5 rounded-lg ml-auto cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Query Hospital PACS (C-FIND)</span>
          </Button>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      {searched && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-secondary font-mono">
            <span>Query Results ({results.length})</span>
            {loading && <span className="flex items-center gap-1 text-primary"><Loader2 className="w-3 h-3 animate-spin" /> Querying DIMSE...</span>}
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {results.map((study) => (
                <StandbyCaseCard key={study.accessionNumber} study={study} />
              ))}
            </div>
          ) : !loading && (
            <div className="p-8 text-center text-secondary text-xs rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/30">
              No matching DICOM studies found on PACS server for the selected criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
