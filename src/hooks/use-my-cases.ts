'use client';

// Layer 2/Presentation Hook: My Cases Workstation State & Actions
// Strict File Size Invariant: Target < 250 lines

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { ShiftDateRangeType } from '@/components/my-cases/my-cases-filter-bar';
import { executeReleaseCase, executeBatchRelease, executeStatusChange } from '@/hooks/worklist-case-utils';
import { useMyCasesStatusTracker } from './use-my-cases-status-tracker';
import {
  loadSavedMyCasesFilters,
  saveMyCasesFilters,
  clearSavedMyCasesFilters,
} from '@/lib/table-filter-storage';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface UseMyCasesProps {
  initialCases?: PacsStudyResult[];
  initialTotal?: number;
}

export function useMyCases({ initialCases = [], initialTotal = 0 }: UseMyCasesProps = {}) {
  const [cases, setCases] = useState<PacsStudyResult[]>(initialCases);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [modality, setModality] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [department, setDepartment] = useState('all');
  const [bodyPart, setBodyPart] = useState('all');
  const [dateRange, setDateRange] = useState<ShiftDateRangeType>('shift');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [imagesReadyOnly, setImagesReadyOnly] = useState(false);
  const [showFilmCharges, setShowFilmCharges] = useState(false);

  // Selection & Pagination
  const [selectedAccessions, setSelectedAccessions] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const isHydratedRef = useRef(false);

  // 1. Hydrate saved filters on client mount (zero PHI/search prefill)
  useEffect(() => {
    if (isHydratedRef.current) return;
    isHydratedRef.current = true;

    const saved = loadSavedMyCasesFilters();
    if (!saved) return;

    if (saved.modality && saved.modality !== 'all') setModality(saved.modality);
    if (saved.status && saved.status !== 'all') setStatus(saved.status);
    if (saved.priority && saved.priority !== 'all') setPriority(saved.priority);
    if (saved.department && saved.department !== 'all') setDepartment(saved.department);
    if (saved.bodyPart && saved.bodyPart !== 'all') setBodyPart(saved.bodyPart);
    if (saved.dateRange) setDateRange(saved.dateRange as any);
    if (saved.customFrom) setCustomFrom(saved.customFrom);
    if (saved.customTo) setCustomTo(saved.customTo);
    if (typeof saved.imagesReadyOnly === 'boolean') setImagesReadyOnly(saved.imagesReadyOnly);
    if (typeof saved.showFilmCharges === 'boolean') setShowFilmCharges(saved.showFilmCharges);
    if (saved.pageSize && saved.pageSize > 0) setPageSize(saved.pageSize);
    if (saved.sortField) setSortField(saved.sortField);
    if (saved.sortDirection) setSortDirection(saved.sortDirection);
  }, []);

  // 2. Persist after hydration whenever any filter changes
  useEffect(() => {
    if (!isHydratedRef.current) return;
    saveMyCasesFilters({
      modality, status, priority, department, bodyPart, dateRange,
      customFrom, customTo, imagesReadyOnly, showFilmCharges, pageSize,
      sortField, sortDirection,
    });
  }, [
    modality, status, priority, department, bodyPart, dateRange,
    customFrom, customTo, imagesReadyOnly, showFilmCharges, pageSize,
    sortField, sortDirection,
  ]);

  const isFiltered =
    dateRange !== 'shift' ||
    Boolean(customFrom) ||
    Boolean(customTo) ||
    searchQuery.trim().length > 0 ||
    modality !== 'all' ||
    status !== 'all' ||
    priority !== 'all' ||
    department !== 'all' ||
    bodyPart !== 'all' ||
    imagesReadyOnly ||
    showFilmCharges;

  const handleResetFilters = useCallback(() => {
    clearSavedMyCasesFilters();
    setDateRange('shift');
    setCustomFrom('');
    setCustomTo('');
    setSearchQuery('');
    setModality('all');
    setStatus('all');
    setPriority('all');
    setDepartment('all');
    setBodyPart('all');
    setImagesReadyOnly(false);
    setShowFilmCharges(false);
    setCurrentPage(1);
  }, []);

  const fetchMyCases = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('assignedTo', 'me');
      p.set('dateRange', dateRange);
      if (dateRange === 'custom') {
        if (customFrom) p.set('dateFrom', customFrom);
        if (customTo) p.set('dateTo', customTo);
      }
      if (searchQuery.trim()) p.set('query', searchQuery.trim());
      if (modality !== 'all') p.set('modality', modality);
      if (status !== 'all') p.set('status', status);
      if (priority !== 'all') p.set('priority', priority);
      if (department !== 'all') p.set('department', department);
      if (bodyPart !== 'all') p.set('bodyPart', bodyPart);
      if (imagesReadyOnly) p.set('imagesReadyOnly', 'true');
      if (showFilmCharges) p.set('hideFilmCharges', 'false');
      else p.set('hideFilmCharges', 'true');

      const sortFieldKey = sortField === 'patient' ? 'patient_name' : sortField;
      p.set('sortBy', `${sortFieldKey}_${sortDirection}`);
      p.set('limit', String(pageSize));
      p.set('page', String(currentPage));

      const res = await fetch(`/api/worklist?${p.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        setTotalCount(data.total || 0);
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn('[MY_CASES] Failed fetching cases:', err);
      }
    } catch (err) {
      console.warn('[MY_CASES_NETWORK_ERR]', err);
    } finally {
      setLoading(false);
    }
  }, [
    dateRange,
    customFrom,
    customTo,
    searchQuery,
    modality,
    status,
    priority,
    department,
    bodyPart,
    imagesReadyOnly,
    showFilmCharges,
    sortField,
    sortDirection,
    pageSize,
    currentPage,
  ]);

  useEffect(() => {
    fetchMyCases();
  }, [fetchMyCases]);

  const handleToggleSelect = (acc: string) => {
    setSelectedAccessions((prev) => {
      const next = new Set(prev);
      if (next.has(acc)) next.delete(acc);
      else next.add(acc);
      return next;
    });
  };

  const isAllSelected = cases.length > 0 && cases.every((c) => selectedAccessions.has(c.accessionNumber));
  const handleToggleSelectAll = () => {
    if (isAllSelected) setSelectedAccessions(new Set());
    else setSelectedAccessions(new Set(cases.map((c) => c.accessionNumber)));
  };

  const selectedCasesList = useMemo(() => {
    return cases.filter((c) => selectedAccessions.has(c.accessionNumber));
  }, [cases, selectedAccessions]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handleRelease = async (acc: string) => {
    try {
      const res = await executeReleaseCase(acc);
      if (res.success) {
        const releasedAccs = res.releasedAccessions || [acc];
        const releasedSet = new Set(releasedAccs.map((a: string) => a.toLowerCase()));
        notify.success(releasedAccs.length > 1 ? `Released ${releasedAccs.length} companion studies.` : `Case ${acc} released.`);
        setCases((prev) => prev.filter((c) => !releasedSet.has(c.accessionNumber.toLowerCase())));
        setSelectedAccessions((prev) => {
          const next = new Set(prev);
          for (const a of releasedAccs) next.delete(a);
          return next;
        });
        setTotalCount((prev) => Math.max(0, prev - releasedAccs.length));
        fetchMyCases();
      } else {
        notify.error(res.error || `Failed to release case ${acc}`);
      }
    } catch (err: any) {
      notify.error(err.message || `Failed to release case ${acc}`);
    }
  };

  const handleStatusChange = async (reportId: string | undefined, studyId: string | undefined, targetStatus: string, acc?: string) => {
    try {
      const res = await executeStatusChange(reportId, studyId, targetStatus, acc);
      if (res.success) {
        notify.success('Status updated successfully');
        setCases((prev) =>
          prev.map((c) => {
            const isMatch = (studyId && c.studyId === studyId) || (acc && c.accessionNumber === acc);
            return isMatch ? { ...c, status: targetStatus as any, reportId: res.reportId || c.reportId } : c;
          })
        );
      } else {
        notify.error(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      notify.error(err.message || 'Failed to update status');
    }
  };

  const handleBatchRelease = async (accessions: string[]) => {
    const res = await executeBatchRelease(accessions);
    if (!res.success) {
      throw new Error(res.error || 'Failed to release selected cases');
    }
    const releasedAccs = res.allReleasedAccessions || accessions;
    const releasedSet = new Set(releasedAccs.map((a: string) => a.toLowerCase()));

    setCases((prev) => prev.filter((c) => !releasedSet.has(c.accessionNumber.toLowerCase())));
    setSelectedAccessions(new Set());
    setTotalCount((prev) => Math.max(0, prev - releasedAccs.length));
    fetchMyCases();
  };

  const handleBatchStatus = async (targetStatus: string) => {
    for (const c of selectedCasesList) {
      await handleStatusChange(c.reportId, c.studyId, targetStatus, c.accessionNumber);
    }
  };

  const { syncingMyStatus, trackCasesStatus } = useMyCasesStatusTracker({
    cases,
    setCases,
    fetchMyCases,
  });

  const hasAutoCheckedRef = useRef(false);
  useEffect(() => {
    if (hasAutoCheckedRef.current) return;
    hasAutoCheckedRef.current = true;
    const t = setTimeout(() => {
      trackCasesStatus(undefined, true);
    }, 2500);
    return () => clearTimeout(t);
  }, [trackCasesStatus]);

  return {
    cases,
    setCases,
    totalCount,
    setTotalCount,
    loading,
    syncingMyStatus,
    syncMyCasesStatus: trackCasesStatus,
    searchQuery,
    setSearchQuery,
    modality,
    setModality,
    status,
    setStatus,
    priority,
    setPriority,
    department,
    setDepartment,
    bodyPart,
    setBodyPart,
    dateRange,
    setDateRange,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    imagesReadyOnly,
    setImagesReadyOnly,
    showFilmCharges,
    setShowFilmCharges,
    isFiltered,
    handleResetFilters,
    selectedAccessions,
    setSelectedAccessions,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sortField,
    sortDirection,
    handleSort,
    isAllSelected,
    handleToggleSelect,
    handleToggleSelectAll,
    selectedCasesList,
    handleRelease,
    handleStatusChange,
    handleBatchRelease,
    handleBatchStatus,
    fetchMyCases,
  };
}
