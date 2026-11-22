'use client';

// Layer 4 (Presentation/Hooks): Worklist Cases Query & State Orchestrator (<250 lines)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PacsStudyResult } from '@/types/pacs';
import type { AdvancedFilterValues } from '@/components/worklist/worklist-advanced-drawer';
import {
  defaultAdvancedFilters,
  normalizeLegacyRows,
  buildWorklistQueryParams,
  buildHmisSyncPayload,
  isPlainFilterObject,
} from './worklist-case-utils';
import { useWorklistFilterPersistence } from './use-worklist-filter-persistence';
import { useWorklistCaseActions } from './use-worklist-case-actions';
import { notify } from '@/services/notification.service';

export { normalizeLegacyRows };

export interface WorklistStats {
  total: number;
  statCount: number;
  draftCount: number;
  finalCount: number;
  prelimCount: number;
  myCount?: number;
  unassignedCount?: number;
  hmisCount?: number;
  erCount?: number;
  opdCount?: number;
  wardCount?: number;
  filmChargesHiddenCount?: number;
}

export function useWorklistCases(initialCases: PacsStudyResult[] = [], initialTotal = 0, initialStats?: WorklistStats) {
  const [cases, setCases] = useState<PacsStudyResult[]>(initialCases);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const [stats, setStats] = useState<WorklistStats | undefined>(initialStats);
  const [loading, setLoading] = useState(false);
  const [syncingHmis, setSyncingHmis] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const validTabs = ['proceeded', 'all', 'tracking', 'published', 'tat', 'archive', 'hmis', 'unassigned', 'discrepancy'];
  const initialTab = validTabs.includes(tabParam || '') ? tabParam : 'proceeded';
  const [tabFilter, setTabFilter] = useState<any>(initialTab);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<'all' | 'er' | 'opd' | 'ward'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showFilmCharges, setShowFilmCharges] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterValues>(defaultAdvancedFilters);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { clearSavedWorklistFilters } = useWorklistFilterPersistence({
    tabParam, validTabs, tabFilter, setTabFilter,
    departmentFilter, setDepartmentFilter, statusFilter, setStatusFilter,
    modalityFilter, setModalityFilter, priorityFilter, setPriorityFilter,
    sourceFilter, setSourceFilter, showFilmCharges, setShowFilmCharges,
    advancedFilters, setAdvancedFilters, pageSize, setPageSize,
    sortField, setSortField, sortDirection, setSortDirection,
  });

  const {
    handleClaimCase, handleBatchClaimCases, handleReleaseCase,
    handleStatusChange, handleTrackCase, handleBatchDeleteCases,
  } = useWorklistCaseActions(setCases, setTotalCount, setUpdatingId, setTrackingId);

  const autoSyncedRef = useRef(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d?.user?.id) setCurrentUserId(d.user.id); })
      .catch(() => {});
  }, []);

  const handleSort = (field: string) => {
    setSortDirection((prev) => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    if (sortField !== field) setSortField(field);
    setCurrentPage(1);
  };

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildWorklistQueryParams({
        searchQuery,
        statusFilter,
        modalityFilter,
        priorityFilter,
        sourceFilter,
        departmentFilter,
        advancedFilters,
        tabFilter,
        sortField,
        sortDirection,
        pageSize,
        currentPage,
        showFilmCharges,
      });

      const res = await fetch(`/api/worklist?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCases(data.cases || []);
          setTotalCount(data.total || 0);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('[WORKLIST_QUERY_ERR]', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, modalityFilter, priorityFilter, sourceFilter, showFilmCharges, departmentFilter, advancedFilters, tabFilter, pageSize, currentPage, sortField, sortDirection]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchCases(); }, 250);
    return () => clearTimeout(timer);
  }, [fetchCases]);

  const handleSyncHmis = useCallback(async (customFilters?: Record<string, any> | unknown) => {
    setSyncingHmis(true);
    try {
      const safeFilters = isPlainFilterObject(customFilters) ? customFilters : undefined;
      // If caller explicitly passed a query filter (e.g. "Search & Pull <query>"), scope to that query.
      // Otherwise, keep sync broad to current filters (modality + dateRange) without narrowing by search bar text.
      const explicitQuery = (safeFilters?.query || safeFilters?.searchQuery) as string | undefined;
      const syncBody = buildHmisSyncPayload({
        modalityFilter,
        departmentFilter,
        dateRange: advancedFilters.dateRange,
        startDate: advancedFilters.dateFrom,
        endDate: advancedFilters.dateTo,
        searchQuery: explicitQuery,
      }, safeFilters);

      const res = await fetch('/api/hmis/sync-worklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncBody),
      });
      const data = await res.json();
      if (res.ok && data.success && !data.summary?.error) {
        await fetchCases();
        const summary = data.summary;
        if (summary && summary.totalFetched > 0) {
          notify.success(`HMIS sync complete: ${summary.totalFetched} cases (${summary.newStudiesCreated || 0} new, ${summary.existingUpdated || 0} updated)`);
        } else {
          notify.info('HMIS sync finished. No matching cases found for the selected filter.');
        }
      } else {
        notify.error(data.error || data.summary?.error || 'Failed to sync cases from HMIS.');
      }
    } catch (err: any) {
      console.error('[HMIS_SYNC_ERR]', err);
      notify.error(`HMIS sync error: ${err.message || 'Network error'}`);
    } finally {
      setSyncingHmis(false);
    }
  }, [modalityFilter, departmentFilter, advancedFilters.dateRange, advancedFilters.dateFrom, advancedFilters.dateTo, searchQuery, fetchCases]);

  const handleSearchSubmit = useCallback(async (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
    if (!q) return;

    setLoading(true);
    let localHits = 0;
    try {
      const params = buildWorklistQueryParams({
        searchQuery: q,
        statusFilter,
        modalityFilter,
        priorityFilter,
        sourceFilter,
        departmentFilter,
        advancedFilters,
        tabFilter,
        sortField,
        sortDirection,
        pageSize,
        currentPage: 1,
        showFilmCharges,
      });

      const res = await fetch(`/api/worklist?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCases(data.cases || []);
          setTotalCount(data.total || 0);
          if (data.stats) setStats(data.stats);
          localHits = (data.cases || []).length;
        }
      }
    } catch (err) {
      console.error('[LOCAL_SEARCH_ERR]', err);
    } finally {
      setLoading(false);
    }

    // Auto-cascade to All Dates if 0 local results with active relative date filter
    if (localHits === 0 && advancedFilters.dateRange !== 'all') {
      try {
        const allDatesParams = buildWorklistQueryParams({
          searchQuery: q,
          statusFilter,
          modalityFilter,
          priorityFilter,
          sourceFilter,
          departmentFilter,
          advancedFilters: { ...advancedFilters, dateRange: 'all' },
          tabFilter,
          sortField,
          sortDirection,
          pageSize,
          currentPage: 1,
          showFilmCharges,
        });
        const allRes = await fetch(`/api/worklist?${allDatesParams.toString()}`).then((r) => r.json());
        if (allRes?.success && (allRes.cases || []).length > 0) {
          setAdvancedFilters((prev) => ({ ...prev, dateRange: 'all' }));
          setCases(allRes.cases);
          setTotalCount(allRes.total || 0);
          if (allRes.stats) setStats(allRes.stats);
          notify.info(`Found ${allRes.total} case(s) across all dates (date filter expanded to All).`);
          return;
        }
      } catch {}
    }

    // Auto-cascade to HMIS if 0 local results and query is an accession or MRN
    const isIdentifier = /^\d{8,16}$/.test(q);
    if (localHits === 0 && isIdentifier) {
      notify.info(`Searching HMIS portal for ${q}...`);
      await handleSyncHmis({ query: q });
    }
  }, [searchQuery, statusFilter, modalityFilter, priorityFilter, sourceFilter, departmentFilter, advancedFilters, tabFilter, sortField, sortDirection, pageSize, showFilmCharges, handleSyncHmis]);

  // Non-blocking auto-sync on mount ONLY when explicitly enabled by user
  useEffect(() => {
    if (!autoSyncEnabled) return;
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;

    fetch('/api/hmis/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.online && (Number(data.activeSessions) === 0 || data.activeSessions === undefined)) {
          handleSyncHmis();
        }
      })
      .catch(() => {});
  }, [autoSyncEnabled, handleSyncHmis]);

  const handleReset = () => {
    clearSavedWorklistFilters();
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    modalityFilter !== 'all' && setModalityFilter('all');
    priorityFilter !== 'all' && setPriorityFilter('all');
    sourceFilter !== 'all' && setSourceFilter('all');
    setTabFilter('all');
    setSortField('date');
    setSortDirection('desc');
    setAdvancedFilters(defaultAdvancedFilters);
    setCurrentPage(1);
  };

  return {
    cases, setCases, totalCount, setTotalCount, stats, loading, syncingHmis,
    trackingId, updatingId, currentUserId, tabFilter, setTabFilter,
    departmentFilter, setDepartmentFilter, searchQuery, setSearchQuery,
    statusFilter, setStatusFilter, modalityFilter, setModalityFilter,
    priorityFilter, setPriorityFilter, sourceFilter, setSourceFilter,
    showFilmCharges, setShowFilmCharges, advancedFilters, setAdvancedFilters,
    sortField, sortDirection, handleSort, currentPage, setCurrentPage,
    pageSize, setPageSize, fetchCases, handleClaimCase, handleBatchClaimCases,
    handleReleaseCase, handleStatusChange, handleTrackCase, handleSyncHmis,
    handleSearchSubmit, handleReset, handleBatchDeleteCases, autoSyncEnabled, setAutoSyncEnabled,
  };
}
