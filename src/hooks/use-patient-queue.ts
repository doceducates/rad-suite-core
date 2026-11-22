'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PacsStudyResult } from '@/types/pacs';
import type { ReportSectionsState } from '@/components/workstation/report-section-dots';
import { parseStudyTimestamp } from '@/services/study-sorting';

export type PatientQueueSortField = 'date' | 'name' | 'status';
export type PatientQueueSortOrder = 'asc' | 'desc';

const QUEUE_SORT_FIELD_KEY = 'radsuite_queue_sort_field';
const QUEUE_SORT_ORDER_KEY = 'radsuite_queue_sort_order';
const QUEUE_SCOPE_KEY = 'radsuite_queue_scope';

export interface UsePatientQueueOptions {
  isOpen: boolean;
  currentAccession?: string;
  currentCaseId?: string;
  currentSections?: ReportSectionsState;
  currentUserId?: string;
  defaultScope?: 'all' | 'mine' | 'incomplete';
}

export function usePatientQueue({
  isOpen,
  currentAccession,
  currentCaseId,
  currentSections,
  currentUserId,
  defaultScope = 'mine',
}: UsePatientQueueOptions) {
  const [cases, setCases] = useState<PacsStudyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [scope, setScopeState] = useState<'all' | 'mine' | 'incomplete'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(QUEUE_SCOPE_KEY);
      if (saved === 'all' || saved === 'mine' || saved === 'incomplete') return saved;
    }
    return defaultScope;
  });

  const [sortField, setSortFieldState] = useState<PatientQueueSortField>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(QUEUE_SORT_FIELD_KEY);
      if (saved === 'date' || saved === 'name' || saved === 'status') return saved;
    }
    return 'date';
  });

  const [sortOrder, setSortOrderState] = useState<PatientQueueSortOrder>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(QUEUE_SORT_ORDER_KEY);
      if (saved === 'asc' || saved === 'desc') return saved;
    }
    return 'desc';
  });

  const setScope = useCallback((newScope: 'all' | 'mine' | 'incomplete') => {
    setScopeState(newScope);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(QUEUE_SCOPE_KEY, newScope); } catch {}
    }
  }, []);

  const setSortField = useCallback((field: PatientQueueSortField) => {
    setSortFieldState(field);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(QUEUE_SORT_FIELD_KEY, field); } catch {}
    }
  }, []);

  const setSortOrder = useCallback((order: PatientQueueSortOrder) => {
    setSortOrderState(order);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem(QUEUE_SORT_ORDER_KEY, order); } catch {}
    }
  }, []);

  // Fetch unified case queue when opened, mounted, or scope toggles
  useEffect(() => {
    let isMounted = true;
    const fetchQueue = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        // Canonical taken up cases logic: all scopes (recent mine, all backlog, incomplete) filter to cases of mine
        params.set('assignedTo', 'me');
        if (currentUserId) {
          params.set('currentUserId', currentUserId);
        }

        if (scope === 'mine') {
          // Only most recent (today and yesterday cases like last 48 hours)
          params.set('dateRange', '48h');
          params.set('limit', '80');
        } else if (scope === 'all') {
          // All backlog cases of mine
          params.set('dateRange', 'all');
          params.set('limit', '250');
        } else if (scope === 'incomplete') {
          params.set('dateRange', 'all');
          params.set('limit', '250');
        }

        const res = await fetch(`/api/worklist?${params.toString()}`);
        const data = await res.json();
        if (isMounted && data?.success && Array.isArray(data.cases)) {
          setCases(data.cases);
        }
      } catch (err) {
        console.error('Failed fetching queue cases:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchQueue();
    return () => { isMounted = false; };
  }, [isOpen, scope, currentUserId]);

  // Compute live sections for the active case, overriding with real-time editor state if matching
  const resolvedCases = useMemo(() => {
    return cases.map((c) => {
      const isCur =
        (currentAccession && c.accessionNumber?.toUpperCase() === currentAccession.toUpperCase()) ||
        (currentCaseId && (c.localCaseId === currentCaseId || c.studyId === currentCaseId || c.studyInstanceUid === currentCaseId));

      if (isCur && currentSections) {
        return {
          ...c,
          reportSections: {
            history: Boolean(currentSections.history),
            findings: Boolean(currentSections.findings),
            impression: Boolean(currentSections.impression),
          },
        };
      }
      return c;
    });
  }, [cases, currentAccession, currentCaseId, currentSections]);

  // Filter cases based on search and scope
  const filteredCases = useMemo(() => {
    return resolvedCases.filter((c) => {
      // 1. Ensure cases belong to current user if currentUserId is set
      if (currentUserId && c.assignedRadiologistId) {
        if (c.assignedRadiologistId.toLowerCase() !== currentUserId.toLowerCase()) {
          return false;
        }
      }

      // 2. Scope: 'mine' (Taken Up) -> strictly today and yesterday (last 48 hours)
      if (scope === 'mine') {
        const studyTime = parseStudyTimestamp(c.studyDate, c.studyTime);
        const claimTime = c.claimedAt ? parseStudyTimestamp(c.claimedAt) : 0;
        const time = claimTime || studyTime;
        if (time && !isNaN(time)) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          if (time < todayStart - 86400000) {
            return false;
          }
        }
      }

      // 3. Scope: 'incomplete' -> only cases missing history, findings, or impression
      if (scope === 'incomplete') {
        const sec = c.reportSections;
        if (sec && sec.history && sec.findings && sec.impression) return false;
      }

      // 4. Search text filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.patientName?.toLowerCase().includes(q) ||
        c.accessionNumber?.toLowerCase().includes(q) ||
        c.patientMrn?.toLowerCase().includes(q) ||
        c.modality?.toLowerCase().includes(q) ||
        c.studyDescription?.toLowerCase().includes(q)
      );
    });
  }, [resolvedCases, scope, currentUserId, search]);

  const toggleSort = (field: PatientQueueSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' || field === 'status' ? 'asc' : 'desc');
    }
  };

  // Sort filtered cases based on active sortField and sortOrder
  const sortedCases = useMemo(() => {
    return [...filteredCases].sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') {
        comp = (a.patientName || '').localeCompare(b.patientName || '');
      } else if (sortField === 'status') {
        const fillA = [a.reportSections?.history, a.reportSections?.findings, a.reportSections?.impression].filter(Boolean).length;
        const fillB = [b.reportSections?.history, b.reportSections?.findings, b.reportSections?.impression].filter(Boolean).length;
        comp = fillA - fillB;
      } else {
        // 'date' (most recent claim / study date)
        const tsA = Math.max(parseStudyTimestamp(a.studyDate, a.studyTime) || 0, a.claimedAt ? parseStudyTimestamp(a.claimedAt) : 0);
        const tsB = Math.max(parseStudyTimestamp(b.studyDate, b.studyTime) || 0, b.claimedAt ? parseStudyTimestamp(b.claimedAt) : 0);
        comp = tsA - tsB;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredCases, sortField, sortOrder]);

  // Find current and next case within the sorted active queue
  const currentIndex = sortedCases.findIndex(
    (c) =>
      (currentAccession && c.accessionNumber?.toUpperCase() === currentAccession.toUpperCase()) ||
      (currentCaseId && (c.localCaseId === currentCaseId || c.studyId === currentCaseId || c.studyInstanceUid === currentCaseId))
  );

  const prevCase = currentIndex > 0 ? sortedCases[currentIndex - 1] : undefined;

  const nextCase = currentIndex >= 0 && currentIndex < sortedCases.length - 1
    ? sortedCases[currentIndex + 1]
    : undefined;

  const nextIncompleteCase = sortedCases.find((c, idx) => {
    if (idx <= currentIndex) return false;
    const sec = c.reportSections;
    return !sec || !sec.history || !sec.findings || !sec.impression;
  }) || sortedCases.find((c) => {
    const sec = c.reportSections;
    return !sec || !sec.history || !sec.findings || !sec.impression;
  });

  const activeDisplaySections = currentSections || (currentIndex >= 0 ? resolvedCases[currentIndex]?.reportSections : undefined);

  return {
    cases,
    resolvedCases,
    filteredCases: sortedCases,
    loading,
    search,
    setSearch,
    scope,
    setScope,
    sortField,
    sortOrder,
    toggleSort,
    currentIndex,
    prevCase,
    nextCase,
    nextIncompleteCase,
    activeDisplaySections,
  };
}
