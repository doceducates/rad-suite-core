'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle, Server } from 'lucide-react';
import { PacsFilterBar } from './pacs-filter-bar';
import { PacsResultsTable } from './pacs-results-table';
import {
  loadSavedPacsQueryFilters,
  savePacsQueryFilters,
  clearSavedPacsQueryFilters,
} from '@/lib/table-filter-storage';
import type { PacsStudyResult } from '@/types/pacs';

export function PacsQueryClient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [source, setSource] = useState<'all' | 'local' | 'pacs'>('all');

  const [studies, setStudies] = useState<PacsStudyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingAccession, setOpeningAccession] = useState<string | null>(null);
  const [importedMap, setImportedMap] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);

  const isHydratedRef = useRef(false);

  // 1. Hydrate saved filters on client mount (zero PHI/search prefill)
  useEffect(() => {
    if (isHydratedRef.current) return;
    isHydratedRef.current = true;

    const saved = loadSavedPacsQueryFilters();
    if (!saved) return;

    if (saved.modality && saved.modality !== 'all') setModality(saved.modality);
    if (saved.dateRange && saved.dateRange !== 'all') setDateRange(saved.dateRange as any);
    if (saved.dateFrom) setDateFrom(saved.dateFrom);
    if (saved.dateTo) setDateTo(saved.dateTo);
    if (saved.source && saved.source !== 'all') setSource(saved.source as any);
  }, []);

  // 2. Persist after hydration whenever any filter changes
  useEffect(() => {
    if (!isHydratedRef.current) return;
    savePacsQueryFilters({
      modality,
      dateRange,
      dateFrom,
      dateTo,
      source,
    });
  }, [modality, dateRange, dateFrom, dateTo, source]);

  const executeQuery = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/pacs/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query || undefined,
          modality: modality === 'all' ? undefined : modality,
          source,
          dateRange: dateRange !== 'custom' ? dateRange : undefined,
          dateFrom: dateRange === 'custom' && dateFrom ? dateFrom : undefined,
          dateTo: dateRange === 'custom' && dateTo ? dateTo : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStudies(data.studies || []);
        if (data.studies.length === 0) {
          setMessage('No studies found matching the selected filters.');
        }
      } else {
        setMessage(data.error || 'Failed to query PACS archive.');
      }
    } catch {
      setMessage('Network connection to PACS query bridge failed.');
    } finally {
      setLoading(false);
    }
  }, [query, modality, source, dateRange, dateFrom, dateTo]);

  useEffect(() => {
    executeQuery();
  }, [dateRange, source]);

  const handleReset = () => {
    clearSavedPacsQueryFilters();
    setQuery('');
    setModality('all');
    setDateRange('all');
    setDateFrom('');
    setDateTo('');
    setSource('all');
  };

  const handleOpenWorkstation = async (study: PacsStudyResult) => {
    setOpeningAccession(study.accessionNumber);
    try {
      await fetch('/api/pacs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(study),
      });
      setImportedMap((prev) => ({ ...prev, [study.accessionNumber]: true }));
      const targetId = study.localCaseId || study.accessionNumber;
      router.push(`/workstation/${targetId}`);
    } catch {
      router.push(`/workstation/${study.accessionNumber}`);
    }
  };

  return (
    <Card className="border-outline-variant/60 bg-surface shadow-xs">
      <CardHeader className="pb-3 border-b border-outline-variant/60">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-on-surface">
          <Server className="w-4 h-4 text-primary" />
          Unified Clinical Archive & PACS Query (C-FIND)
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs">
        <PacsFilterBar
          query={query}
          setQuery={setQuery}
          modality={modality}
          setModality={setModality}
          dateRange={dateRange}
          setDateRange={setDateRange}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          source={source}
          setSource={setSource}
          loading={loading}
          onSearch={executeQuery}
          onReset={handleReset}
        />

        {message && (
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {message}
          </div>
        )}

        <PacsResultsTable
          studies={studies}
          openingAccession={openingAccession}
          importedMap={importedMap}
          onOpenWorkstation={handleOpenWorkstation}
        />
      </CardContent>
    </Card>
  );
}
