'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { notify } from '@/services/notification.service';
import { clinicTaskTracker } from '@/services/clinic-task-tracker.service';
import type { LocalResidentStudy, ClinicActionType } from '@/services/clinic-node.service';
import type { UnifiedPatientStudy } from './clinic-patient-row';
import { buildUnifiedCatalog, matchesStudyDate } from './clinic-catalog-builder';

interface UseClinicPatientCatalogProps {
  localStudies?: LocalResidentStudy[];
  syncedStudies?: any[];
  onAction?: (action: ClinicActionType, payload?: any) => Promise<void>;
  onRefreshNode?: () => void;
  selectedNodeId?: string;
}

export function useClinicPatientCatalog({
  localStudies = [],
  syncedStudies = [],
  onAction,
  onRefreshNode,
  selectedNodeId,
}: UseClinicPatientCatalogProps) {
  const [queriedPacsStudies, setQueriedPacsStudies] = useState<UnifiedPatientStudy[]>([]);
  const [search, setSearch] = useState('');
  const [modality, setModality] = useState('ALL');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<'all' | 'sandbox' | 's3' | 'pacs'>('all');
  const [pullAccInput, setPullAccInput] = useState('');
  const [isQueryingScanner, setIsQueryingScanner] = useState(false);
  const [pullingAcc, setPullingAcc] = useState<string | null>(null);
  const [uploadingAcc, setUploadingAcc] = useState<string | null>(null);
  const [purgingAcc, setPurgingAcc] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selection State
  const [selectedAccessions, setSelectedAccessions] = useState<Set<string>>(new Set());
  const [trackedVersion, setTrackedVersion] = useState(0);

  useEffect(() => {
    return clinicTaskTracker.subscribe(() => setTrackedVersion((v) => v + 1));
  }, []);

  const isStudyUploading = useCallback((acc: string) => {
    if (uploadingAcc === acc || isBatchProcessing) return true;
    return clinicTaskTracker.getTrackedUploads().some((t) => t.accession === acc && (t.status === 'saving' || t.status === 'pending'));
  }, [uploadingAcc, isBatchProcessing, trackedVersion]);

  // 1. Build Master Unified Catalog combining Sandbox + Synced + Queried PACS
  const allMergedStudies = useMemo(() => {
    return buildUnifiedCatalog(localStudies, syncedStudies, queriedPacsStudies);
  }, [localStudies, syncedStudies, queriedPacsStudies]);

  // Client-Side Filtering
  const filteredStudies = useMemo(() => {
    return allMergedStudies.filter((st) => {
      if (modality !== 'ALL' && st.modality.toUpperCase() !== modality) return false;
      if (stageFilter === 'sandbox' && st.location !== 'sandbox' && !st.hasLocalSeries && !st.sizeMb) return false;
      if (stageFilter === 's3' && st.s3Status !== 'synced') return false;
      if (stageFilter === 'pacs' && (st.location === 'sandbox' || st.s3Status === 'synced' || st.hasLocalSeries)) return false;

      // Filter by Date
      if (!matchesStudyDate(st.studyDate, datePreset, customFrom, customTo)) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = st.patientName.toLowerCase().includes(q);
        const matchesMrn = (st.patientMrn || st.patientId || '').toLowerCase().includes(q);
        const matchesAcc = st.accessionNumber.toLowerCase().includes(q);
        const matchesDesc = st.studyDescription.toLowerCase().includes(q);
        if (!matchesName && !matchesMrn && !matchesAcc && !matchesDesc) return false;
      }
      return true;
    });
  }, [allMergedStudies, modality, stageFilter, datePreset, customFrom, customTo, search]);

  const totalPages = Math.ceil(filteredStudies.length / pageSize) || 1;
  const paginatedStudies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudies.slice(start, start + pageSize);
  }, [filteredStudies, currentPage, pageSize]);

  // Live Query PACS Scanner
  const handleQueryScanner = useCallback(async () => {
    setIsQueryingScanner(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (modality !== 'ALL') params.set('modality', modality);
      if (datePreset !== 'all') params.set('datePreset', datePreset);
      if (customFrom) params.set('customFrom', customFrom);
      if (customTo) params.set('customTo', customTo);
      params.set('limit', '50');

      const res = await fetch(`/api/pacs/hospital-query?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.studies)) {
          const mapped: UnifiedPatientStudy[] = data.studies.map((st: any) => ({
            id: st.id,
            patientName: st.patientName || 'PATIENT',
            patientId: st.patientId || '',
            patientMrn: st.patientMrn || st.patientId,
            accessionNumber: (st.accessionNumber || '').toUpperCase().trim(),
            studyDate: st.studyDate || '',
            studyTime: st.studyTime || '',
            modality: st.modality || 'MR',
            studyDescription: st.studyDescription || '',
            numInstances: st.numInstances || 0,
            numSeries: st.numSeries || 1,
            s3Status: st.s3Status || 'not_uploaded',
            studyInstanceUid: st.studyInstanceUid,
            location: st.s3Status === 'synced' ? 's3' : 'pacs',
          }));
          setQueriedPacsStudies(mapped);
          notify.success(`Scanner query returned ${mapped.length} cases.`);
        }
      }
    } catch {
      notify.error('Failed querying scanner via edge node');
    } finally {
      setIsQueryingScanner(false);
    }
  }, [search, modality, datePreset, customFrom, customTo]);

  const handleDateChange = useCallback((preset: string, from?: string, to?: string) => {
    setDatePreset(preset);
    setCustomFrom(from || '');
    setCustomTo(to || '');
    setCurrentPage(1);
  }, []);

  const handleToggleSelect = (acc: string) => {
    setSelectedAccessions((prev) => {
      const next = new Set(prev);
      if (next.has(acc)) next.delete(acc);
      else next.add(acc);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const pageAccs = paginatedStudies.map((s) => s.accessionNumber);
    const allSelected = pageAccs.every((a) => selectedAccessions.has(a));
    setSelectedAccessions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const a of pageAccs) next.delete(a);
      } else {
        for (const a of pageAccs) next.add(a);
      }
      return next;
    });
  };

  const handlePullStudy = async (studyOrAcc: UnifiedPatientStudy | string, mod = 'MR') => {
    const acc = typeof studyOrAcc === 'string' ? studyOrAcc.trim() : studyOrAcc.accessionNumber;
    const patientName = typeof studyOrAcc === 'string' ? acc : (studyOrAcc.patientName || acc);
    const studyMod = typeof studyOrAcc === 'string' ? mod : (studyOrAcc.modality || mod);
    if (!acc) return;

    setPullingAcc(acc);
    try {
      await clinicTaskTracker.enqueuePull([{ accession: acc, patientName, modality: studyMod }]);
      setPullAccInput('');
      if (onRefreshNode) onRefreshNode();
    } finally {
      setPullingAcc(null);
    }
  };

  const handleUploadStudy = async (study: UnifiedPatientStudy) => {
    setUploadingAcc(study.accessionNumber);
    try {
      await clinicTaskTracker.enqueueUpload(
        [{ accession: study.accessionNumber, patientName: study.patientName, modality: study.modality }],
        selectedNodeId
      );
      if (onRefreshNode) onRefreshNode();
    } finally {
      setUploadingAcc(null);
    }
  };

  const handlePurgeStudy = async (accession: string) => {
    if (!onAction) return;
    setPurgingAcc(accession);
    try {
      await onAction('purge-local-study', { accession });
      notify.success(`Study ${accession} purged from Medical Sandbox.`);
      if (onRefreshNode) onRefreshNode();
    } catch (err: any) {
      notify.error(err.message || 'Failed purging local study');
    } finally {
      setPurgingAcc(null);
    }
  };

  const handleBatchUpload = async () => {
    const targets = allMergedStudies.filter((s) => selectedAccessions.has(s.accessionNumber));
    if (targets.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await clinicTaskTracker.enqueueUpload(
        targets.map((s) => ({ accession: s.accessionNumber, patientName: s.patientName, modality: s.modality })),
        selectedNodeId
      );
      setSelectedAccessions(new Set());
      if (onRefreshNode) onRefreshNode();
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchPurge = async () => {
    if (!onAction) return;
    const targets = Array.from(selectedAccessions);
    setIsBatchProcessing(true);
    try {
      for (const acc of targets) {
        await onAction('purge-local-study', { accession: acc });
      }
      notify.success(`Purged ${targets.length} studies from Medical Sandbox.`);
      setSelectedAccessions(new Set());
      if (onRefreshNode) onRefreshNode();
    } catch {
      notify.error('Failed batch sandbox purge');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchPull = async () => {
    const targets = allMergedStudies.filter((s) => selectedAccessions.has(s.accessionNumber));
    if (targets.length === 0) return;
    setIsBatchProcessing(true);
    try {
      await clinicTaskTracker.enqueuePull(
        targets.map((s) => ({ accession: s.accessionNumber, patientName: s.patientName, modality: s.modality })),
        selectedNodeId
      );
      setSelectedAccessions(new Set());
      if (onRefreshNode) onRefreshNode();
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const selectedList = useMemo(() => {
    return allMergedStudies.filter((s) => selectedAccessions.has(s.accessionNumber));
  }, [allMergedStudies, selectedAccessions]);

  const unsyncedSelectedCount = selectedList.filter((s) => (s.location === 'sandbox' || s.hasLocalSeries) && s.s3Status !== 'synced').length;
  const localSelectedCount = selectedList.filter((s) => s.location === 'sandbox' || s.hasLocalSeries || s.sizeMb).length;
  const pacsOnlySelectedCount = selectedList.filter((s) => s.location === 'pacs' && s.s3Status !== 'synced' && !s.hasLocalSeries).length;

  return {
    allMergedStudies,
    filteredStudies,
    paginatedStudies,
    totalPages,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    modality,
    setModality,
    datePreset,
    setDatePreset,
    customFrom,
    customTo,
    handleDateChange,
    stageFilter,
    setStageFilter,
    pullAccInput,
    setPullAccInput,
    selectedAccessions,
    setSelectedAccessions,
    isQueryingScanner,
    pullingAcc,
    uploadingAcc,
    purgingAcc,
    isBatchProcessing,
    isStudyUploading,
    handleToggleSelect,
    handleToggleSelectAll,
    handleQueryScanner,
    handlePullStudy,
    handleUploadStudy,
    handlePurgeStudy,
    handleBatchUpload,
    handleBatchPurge,
    handleBatchPull,
    unsyncedSelectedCount,
    localSelectedCount,
    pacsOnlySelectedCount,
  };
}
