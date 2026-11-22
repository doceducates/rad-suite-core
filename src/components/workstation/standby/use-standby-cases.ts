'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PacsStudyResult } from '@/types/pacs';
import type { StandbySourceTab } from './standby-types';

export function useStandbyCases(initialCases: PacsStudyResult[] = [], currentUserId?: string) {
  const [scope, setScope] = useState<'mine' | 'all' | 'unassigned'>(initialCases.length > 0 ? 'mine' : 'all');
  const [source, setSource] = useState<StandbySourceTab>('all');
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('all');
  const [region, setRegion] = useState('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [status, setStatus] = useState<string>('all');
  const [studies, setStudies] = useState<PacsStudyResult[]>(initialCases);
  const [counts, setCounts] = useState<Partial<Record<StandbySourceTab, number>>>({});
  const [loading, setLoading] = useState(false);

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pacs/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: source === 'all' ? 'all' : source,
          query: query.trim() || undefined,
          modality: modality === 'all' ? undefined : modality,
          bodyPart: region === 'all' ? undefined : region,
          dateRange: dateRange === 'all' ? undefined : (dateRange as any),
          dateFrom: customFrom || undefined,
          dateTo: customTo || undefined,
          status: status === 'all' ? undefined : status,
          assignedTo: scope === 'mine' ? 'me' : scope === 'unassigned' ? 'unassigned' : undefined,
          currentUserId: currentUserId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.studies)) {
        setStudies(data.studies);
        setCounts((prev) => ({
          ...prev,
          [source]: data.studies.length,
        }));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [source, query, modality, region, dateRange, customFrom, customTo, status, scope, currentUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudies();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchStudies]);

  let activeFilterCount = 0;
  if (source !== 'all') activeFilterCount++;
  if (query.trim()) activeFilterCount++;
  if (modality !== 'all') activeFilterCount++;
  if (region !== 'all') activeFilterCount++;
  if (dateRange !== 'all') activeFilterCount++;
  if (status !== 'all') activeFilterCount++;
  if (scope !== 'mine') activeFilterCount++;

  const resetFilters = useCallback(() => {
    setScope('mine');
    setSource('all');
    setQuery('');
    setModality('all');
    setRegion('all');
    setDateRange('all');
    setCustomFrom('');
    setCustomTo('');
    setStatus('all');
  }, []);

  return {
    scope,
    setScope,
    source,
    setSource,
    activeTab: source,
    setActiveTab: setSource,
    query,
    setQuery,
    modality,
    setModality,
    region,
    setRegion,
    dateRange,
    setDateRange,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    status,
    setStatus,
    studies,
    counts,
    loading,
    refresh: fetchStudies,
    resetFilters,
    activeFilterCount,
  };
}
