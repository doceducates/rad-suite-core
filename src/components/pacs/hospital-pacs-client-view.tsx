'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PacsUnifiedFilterBar, type PacsFilterValues } from './pacs-unified-filter-bar';
import { PacsUnifiedTable } from './pacs-unified-table';
import { PacsUnifiedSelectionBar } from './pacs-unified-selection-bar';
import { usePacsActions } from './use-pacs-actions';
import {
  loadSavedPacsFilters,
  savePacsFilters,
  clearSavedPacsFilters,
} from '@/lib/table-filter-storage';
import { notify } from '@/services/notification.service';
import { LocalFolderImportModal } from './local-folder-import-modal';
import { CaseUploadModal } from './case-upload-modal';
import { PacsServersModal } from './pacs-servers-modal';
import { CaseShareModal } from '@/components/workstation/case-share-modal';
import type { HospitalPacsStudy } from '@/db/schema';

interface HospitalPacsClientViewProps {
  initialStudies?: HospitalPacsStudy[];
  initialTotal?: number;
  isAdmin?: boolean;
  allowedSources?: string[];
}

export function HospitalPacsClientView({
  initialStudies = [],
  initialTotal = 0,
  isAdmin = false,
  allowedSources,
}: HospitalPacsClientViewProps) {
  const router = useRouter();
  const [studies, setStudies] = useState<HospitalPacsStudy[]>(initialStudies);
  const [totalStudies, setTotalStudies] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<string>('studyDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'studyDate' ? 'desc' : 'asc');
    }
  };

  const sortedStudies = useMemo(() => {
    return [...studies].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (sortField === 'patientName') {
        aVal = (a.patientName || '').toLowerCase();
        bVal = (b.patientName || '').toLowerCase();
      } else if (sortField === 'modality') {
        aVal = (a.modality || '').toLowerCase();
        bVal = (b.modality || '').toLowerCase();
      } else if (sortField === 'studyDescription') {
        aVal = (a.studyDescription || '').toLowerCase();
        bVal = (b.studyDescription || '').toLowerCase();
      } else if (sortField === 'numInstances') {
        aVal = Number(a.numInstances || 0);
        bVal = Number(b.numInstances || 0);
      } else if (sortField === 'studyDate') {
        aVal = `${a.studyDate || ''}_${a.studyTime || ''}`;
        bVal = `${b.studyDate || ''}_${b.studyTime || ''}`;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [studies, sortField, sortDirection]);

  const [filters, setFilters] = useState<PacsFilterValues>({
    search: '', searchField: 'all', modality: 'all', region: 'all', datePreset: '48h', location: 'all',
  });
  const [selectedAccessions, setSelectedAccessions] = useState<Set<string>>(new Set());
  const [isFolderImportOpen, setIsFolderImportOpen] = useState(false);
  const [isUploadCaseOpen, setIsUploadCaseOpen] = useState(false);
  const [isPacsServersOpen, setIsPacsServersOpen] = useState(false);
  const [shareStudy, setShareStudy] = useState<HospitalPacsStudy | null>(null);
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (isHydratedRef.current) return;
    isHydratedRef.current = true;
    const saved = loadSavedPacsFilters();
    if (!saved) return;
    if (saved.pageSize) setPageSize(saved.pageSize);
    setFilters((prev) => ({
      ...prev,
      modality: saved.modality || prev.modality,
      region: saved.region || prev.region,
      datePreset: saved.datePreset || prev.datePreset,
      customFrom: saved.customFrom ?? prev.customFrom,
      customTo: saved.customTo ?? prev.customTo,
      location: saved.location || prev.location,
      searchField: saved.searchField || prev.searchField,
      search: '',
    }));
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    savePacsFilters({
      modality: filters.modality, region: filters.region, datePreset: filters.datePreset,
      customFrom: filters.customFrom, customTo: filters.customTo, location: filters.location,
      searchField: filters.searchField, pageSize,
    });
  }, [filters.modality, filters.region, filters.datePreset, filters.customFrom, filters.customTo, filters.location, filters.searchField, pageSize]);

  const fetchStudies = useCallback(async (pageToFetch = currentPage, isBackgroundPoll = false) => {
    if (!isBackgroundPoll) setLoading(true);
    try {
      const p = new URLSearchParams({
        page: String(pageToFetch),
        limit: String(pageSize),
        ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
        ...(filters.searchField !== 'all' ? { searchField: filters.searchField } : {}),
        ...(filters.modality !== 'all' ? { modality: filters.modality } : {}),
        ...(filters.region && filters.region !== 'all' ? { region: filters.region } : {}),
        datePreset: filters.datePreset,
        ...(filters.customFrom ? { customFrom: filters.customFrom } : {}),
        ...(filters.customTo ? { customTo: filters.customTo } : {}),
        ...(filters.location && filters.location !== 'all' ? { location: filters.location } : {}),
      });

      const res = await fetch(`/api/pacs/hospital-query?${p.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.studies)) {
        setStudies(data.studies);
        setTotalStudies(data.total ?? data.studies.length);
      }
    } catch {
      if (!isBackgroundPoll) notify.error('Failed querying Hospital PACS database index');
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  const lastFetchedQueryRef = useRef<string>(
    new URLSearchParams({
      page: '1',
      limit: '25',
      datePreset: '48h',
    }).toString()
  );

  useEffect(() => {
    const currentQuery = new URLSearchParams({
      page: String(currentPage),
      limit: String(pageSize),
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
      ...(filters.searchField !== 'all' ? { searchField: filters.searchField } : {}),
      ...(filters.modality !== 'all' ? { modality: filters.modality } : {}),
      ...(filters.region && filters.region !== 'all' ? { region: filters.region } : {}),
      datePreset: filters.datePreset,
      ...(filters.customFrom ? { customFrom: filters.customFrom } : {}),
      ...(filters.customTo ? { customTo: filters.customTo } : {}),
      ...(filters.location && filters.location !== 'all' ? { location: filters.location } : {}),
    }).toString();

    if (currentQuery === lastFetchedQueryRef.current) {
      return;
    }
    lastFetchedQueryRef.current = currentQuery;
    fetchStudies(currentPage);
  }, [fetchStudies, currentPage, pageSize, filters]);

  useEffect(() => {
    const hasActiveTransfers = studies.some((s: any) =>
      s.downloadProgress || s.uploadProgress || s.s3Status === 'uploading' ||
      s.s3Status === 'downloading' || s.s3Status === 'queued' || s.s3Status === 'retrieving'
    );
    if (!hasActiveTransfers) return;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchStudies(currentPage, true);
    }, 4000);
    return () => clearInterval(timer);
  }, [studies, fetchStudies, currentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMut = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || d.tableName === 'hospital_pacs_studies' || d.tableName === 'studies') fetchStudies(currentPage, true);
    };
    window.addEventListener('radsuite:sync-mutation', onMut);
    return () => window.removeEventListener('radsuite:sync-mutation', onMut);
  }, [fetchStudies, currentPage]);

  const handleFilterChange = (patch: Partial<PacsFilterValues>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setCurrentPage(1);
  };

  const handleToggleSelect = (acc: string) => {
    setSelectedAccessions((prev) => {
      const next = new Set(prev);
      next.has(acc) ? next.delete(acc) : next.add(acc);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allOnPage = studies.every((s) => selectedAccessions.has(s.accessionNumber));
    setSelectedAccessions((prev) => {
      const next = new Set(prev);
      studies.forEach((s) => allOnPage ? next.delete(s.accessionNumber) : next.add(s.accessionNumber));
      return next;
    });
  };

  const {
    isBulkUploading,
    isBulkPulling,
    isBulkDownloading,
    isBulkClaiming,
    handleSinglePull,
    handleSingleSync,
    handleBulkPacsPull,
    handleBulkS3Upload,
    handleStreamAndView,
    handleBulkRadiAntDownload,
    handleClaimCase,
    handleBulkClaimCases,
  } = usePacsActions({
    fetchStudies,
    selectedAccessions,
    setSelectedAccessions,
  });

  const canPull = isAdmin || Boolean(allowedSources?.includes('remote_node') || allowedSources?.includes('pacs') || allowedSources?.includes('*'));
  const canUpload = isAdmin || Boolean(allowedSources?.includes('s3') || allowedSources?.includes('*'));
  const canDownloadZip = isAdmin || Boolean(allowedSources?.includes('s3') || allowedSources?.includes('*'));

  return (
    <div className="space-y-3">
      {/* Top Filter Controls */}
      <PacsUnifiedFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onSearch={() => fetchStudies(1)}
        onReset={() => {
          clearSavedPacsFilters();
          setFilters({ search: '', searchField: 'all', modality: 'all', region: 'all', datePreset: '48h', location: 'all' });
          setCurrentPage(1);
        }}
        onOpenImportFolder={() => setIsFolderImportOpen(true)}
        onOpenUploadCase={() => setIsUploadCaseOpen(true)}
        onOpenPacsServers={isAdmin ? () => setIsPacsServersOpen(true) : undefined}
        allowedSources={allowedSources}
        isAdmin={isAdmin}
        loading={loading}
        totalIndexedCount={totalStudies}
      />

      <PacsUnifiedTable
        studies={sortedStudies}
        selectedAccessions={selectedAccessions}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onSingleSync={handleSingleSync}
        onSinglePull={handleSinglePull}
        onStreamAndView={handleStreamAndView}
        onClaimCase={handleClaimCase}
        onShareCase={(study) => setShareStudy(study)}
        currentPage={currentPage}
        pageSize={pageSize}
        totalStudies={totalStudies}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        loading={loading}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        canPull={false}
        canUpload={false}
        canDownloadZip={canDownloadZip}
      />

      <PacsUnifiedSelectionBar
        selectedCount={selectedAccessions.size}
        totalFilteredCount={totalStudies}
        onClearSelection={() => setSelectedAccessions(new Set())}
        onSelectAllFiltered={() => {
          const next = new Set<string>();
          studies.forEach((s) => next.add(s.accessionNumber));
          setSelectedAccessions(next);
        }}
        onBulkClaim={handleBulkClaimCases}
        onBulkRadiAntDownload={canDownloadZip ? handleBulkRadiAntDownload : undefined}
        isClaiming={isBulkClaiming}
        isDownloading={isBulkDownloading}
      />

      <LocalFolderImportModal
        isOpen={isFolderImportOpen}
        onClose={() => setIsFolderImportOpen(false)}
        onImportComplete={() => fetchStudies(1)}
      />

      <CaseUploadModal
        isOpen={isUploadCaseOpen}
        onClose={() => setIsUploadCaseOpen(false)}
        onUploadSuccess={() => fetchStudies(currentPage)}
      />

      <PacsServersModal
        isOpen={isPacsServersOpen}
        onClose={() => setIsPacsServersOpen(false)}
        isAdmin={isAdmin}
      />

      {shareStudy && (
        <CaseShareModal
          isOpen={Boolean(shareStudy)}
          onClose={() => setShareStudy(null)}
          studyId={shareStudy.id || shareStudy.accessionNumber}
          accessionNumber={shareStudy.accessionNumber}
          modality={shareStudy.modality || 'MR'}
          patientName={shareStudy.patientName || undefined}
        />
      )}
    </div>
  );
}
