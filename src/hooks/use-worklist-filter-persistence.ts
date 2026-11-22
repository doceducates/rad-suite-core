'use client';

import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdvancedFilterValues } from '@/components/worklist/worklist-advanced-drawer';
import {
  loadSavedWorklistFilters,
  saveWorklistFilters,
  clearSavedWorklistFilters,
} from '@/lib/table-filter-storage';

interface UseWorklistFilterPersistenceProps {
  tabParam: string | null;
  validTabs: string[];
  tabFilter: string;
  setTabFilter: Dispatch<SetStateAction<any>>;
  departmentFilter: string;
  setDepartmentFilter: Dispatch<SetStateAction<any>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  modalityFilter: string;
  setModalityFilter: Dispatch<SetStateAction<string>>;
  priorityFilter: string;
  setPriorityFilter: Dispatch<SetStateAction<string>>;
  sourceFilter: string;
  setSourceFilter: Dispatch<SetStateAction<string>>;
  showFilmCharges: boolean;
  setShowFilmCharges: Dispatch<SetStateAction<boolean>>;
  advancedFilters: AdvancedFilterValues;
  setAdvancedFilters: Dispatch<SetStateAction<AdvancedFilterValues>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  sortField: string;
  setSortField: Dispatch<SetStateAction<string>>;
  sortDirection: 'asc' | 'desc';
  setSortDirection: Dispatch<SetStateAction<'asc' | 'desc'>>;
}

export function useWorklistFilterPersistence({
  tabParam,
  validTabs,
  tabFilter,
  setTabFilter,
  departmentFilter,
  setDepartmentFilter,
  statusFilter,
  setStatusFilter,
  modalityFilter,
  setModalityFilter,
  priorityFilter,
  setPriorityFilter,
  sourceFilter,
  setSourceFilter,
  showFilmCharges,
  setShowFilmCharges,
  advancedFilters,
  setAdvancedFilters,
  pageSize,
  setPageSize,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
}: UseWorklistFilterPersistenceProps) {
  const isHydratedRef = useRef(false);

  // 1. Hydrate saved filters on mount (zero hydration mismatch with SSR)
  useEffect(() => {
    if (isHydratedRef.current) return;
    isHydratedRef.current = true;

    const saved = loadSavedWorklistFilters();
    if (!saved) return;

    if (saved.modalityFilter && saved.modalityFilter !== 'all') {
      setModalityFilter(saved.modalityFilter);
    }
    if (saved.statusFilter && saved.statusFilter !== 'all') {
      setStatusFilter(saved.statusFilter);
    }
    if (saved.departmentFilter && saved.departmentFilter !== 'all') {
      setDepartmentFilter(saved.departmentFilter);
    }
    if (saved.priorityFilter && saved.priorityFilter !== 'all') {
      setPriorityFilter(saved.priorityFilter);
    }
    if (saved.sourceFilter && saved.sourceFilter !== 'all') {
      setSourceFilter(saved.sourceFilter);
    }
    if (typeof saved.showFilmCharges === 'boolean') {
      setShowFilmCharges(saved.showFilmCharges);
    }
    if (saved.pageSize && saved.pageSize > 0) {
      setPageSize(saved.pageSize);
    }
    if (saved.sortField) {
      setSortField(saved.sortField);
    }
    if (saved.sortDirection) {
      setSortDirection(saved.sortDirection);
    }
    if (!tabParam && saved.tabFilter && validTabs.includes(saved.tabFilter)) {
      setTabFilter(saved.tabFilter);
    }
    if (saved.advancedFilters) {
      setAdvancedFilters((prev) => ({
        ...prev,
        ...saved.advancedFilters,
      }));
    }
  }, [
    tabParam,
    validTabs,
    setModalityFilter,
    setStatusFilter,
    setDepartmentFilter,
    setPriorityFilter,
    setSourceFilter,
    setShowFilmCharges,
    setPageSize,
    setSortField,
    setSortDirection,
    setTabFilter,
    setAdvancedFilters,
  ]);

  // 2. Persist after hydration when any filter state changes
  useEffect(() => {
    if (!isHydratedRef.current) return;
    saveWorklistFilters({
      tabFilter: tabFilter as any,
      departmentFilter: departmentFilter as any,
      statusFilter,
      modalityFilter,
      priorityFilter,
      sourceFilter,
      showFilmCharges,
      pageSize,
      sortField,
      sortDirection,
      advancedFilters,
    });
  }, [
    tabFilter,
    departmentFilter,
    statusFilter,
    modalityFilter,
    priorityFilter,
    sourceFilter,
    showFilmCharges,
    pageSize,
    sortField,
    sortDirection,
    advancedFilters,
  ]);

  return { clearSavedWorklistFilters };
}
