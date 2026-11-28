'use client';

import React, { useState, useMemo } from 'react';
import { WorklistCockpitHeader } from './worklist-cockpit-header';
import { WorklistFilterBar } from './worklist-filter-bar';
import { WorklistModals } from './worklist-modals';
import { WorklistSelectionBar } from './worklist-selection-bar';
import { WorklistReportingView } from './worklist-reporting-view';
import { WorklistHmisSettingsModal } from './worklist-hmis-settings-modal';
import { CaseShareModal } from '@/components/workstation/case-share-modal';
import { HmisTrackingPanel } from '@/components/hmis/hmis-tracking-panel';
import { HmisPublishedPanel } from '@/components/hmis/hmis-published-panel';
import { HmisTatPanel } from '@/components/hmis/hmis-tat-panel';
import { useWorklistCases, normalizeLegacyRows, type WorklistStats } from '@/hooks/use-worklist-cases';
import type { PacsStudyResult } from '@/types/pacs';

export type { WorklistStats };

interface WorklistTableProps {
  initialCases?: PacsStudyResult[];
  initialTotal?: number;
  initialStats?: WorklistStats;
  initialRows?: any[]; // legacy compatibility
  initialUserId?: string;
}

export function WorklistTable({
  initialCases = [],
  initialTotal = 0,
  initialStats,
  initialRows,
  initialUserId,
}: WorklistTableProps) {
  const normalizedInitialCases: PacsStudyResult[] =
    initialCases.length > 0 ? initialCases : normalizeLegacyRows(initialRows);

  const {
    cases,
    setCases,
    totalCount,
    setTotalCount,
    stats,
    loading,
    updatingId,
    currentUserId,
    currentUserName,
    tabFilter,
    setTabFilter,
    departmentFilter,
    setDepartmentFilter,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    modalityFilter,
    setModalityFilter,
    priorityFilter,
    setPriorityFilter,
    showFilmCharges,
    setShowFilmCharges,
    advancedFilters,
    setAdvancedFilters,
    sortField,
    sortDirection,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    syncingHmis,
    trackingId,
    handleClaimCase,
    handleBatchClaimCases,
    handleReleaseCase,
    handleStatusChange,
    handleTrackCase,
    handleSyncHmis,
    handleSearchSubmit,
    handleReset,
    handleBatchDeleteCases,
    fetchCases,
    autoSyncEnabled,
    setAutoSyncEnabled,
  } = useWorklistCases(normalizedInitialCases, initialTotal || normalizedInitialCases.length, initialStats, initialUserId) as any;

  const [selectedReportStudy, setSelectedReportStudy] = useState<PacsStudyResult | null>(null);
  const [editingStudy, setEditingStudy] = useState<PacsStudyResult | null>(null);
  const [mergeStudy, setMergeStudy] = useState<PacsStudyResult | null>(null);
  const [deletingStudy, setDeletingStudy] = useState<PacsStudyResult | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [sharingStudy, setSharingStudy] = useState<PacsStudyResult | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [pendingModalStudy, setPendingModalStudy] = useState<PacsStudyResult | null>(null);
  const [selectedAccessions, setSelectedAccessions] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleToggleSelect = (acc: string) => {
    setSelectedAccessions((prev) => {
      const next = new Set(prev);
      if (next.has(acc)) next.delete(acc);
      else next.add(acc);
      return next;
    });
  };

  const isAllSelected = cases.length > 0 && cases.every((c: any) => selectedAccessions.has(c.accessionNumber));

  const handleToggleSelectAll = () => {
    if (isAllSelected) setSelectedAccessions(new Set());
    else setSelectedAccessions(new Set(cases.map((c: any) => c.accessionNumber)));
  };

  const handleConfirmDelete = async (accession: string) => {
    await handleBatchDeleteCases([accession]);
  };

  const selectedCasesList = useMemo(() => {
    return cases.filter((c: any) => selectedAccessions.has(c.accessionNumber));
  }, [cases, selectedAccessions]);

  const handleBatchStatus = async (targetStatus: string) => {
    for (const c of selectedCasesList) {
      await handleStatusChange(c.reportId, c.studyId, targetStatus, c.accessionNumber);
    }
  };

  return (
    <div className="space-y-2.5 text-xs font-sans">
      {/* 1. Unified Cockpit Diagnostic Navigation & Responsive Actions Header */}
      <WorklistCockpitHeader
        tabFilter={tabFilter}
        onTabChange={(t) => { setTabFilter(t); setCurrentPage(1); }}
        stats={stats}
        cases={cases}
        totalCount={totalCount}
        proceededCount={stats?.hmisCount ?? stats?.total}
        trackingCount={stats?.unassignedCount}
        syncingHmis={syncingHmis}
        loading={loading}
        onSyncHmis={() => handleSyncHmis()}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenManualCaseModal={() => setIsManualModalOpen(true)}
        onResetFilters={() => handleReset()}
      />

      {/* 2. Streamlined Diagnostic Filter Bar */}
      <WorklistFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
        onSearchSubmit={(q) => handleSearchSubmit(q)}
        syncingHmis={syncingHmis}
        statusFilter={statusFilter}
        onStatusChange={(s) => { setStatusFilter(s); setCurrentPage(1); }}
        modalityFilter={modalityFilter}
        onModalityChange={(m) => { setModalityFilter(m); setCurrentPage(1); }}
        priorityFilter={priorityFilter}
        onPriorityChange={(p) => { setPriorityFilter(p); setCurrentPage(1); }}
        departmentFilter={departmentFilter}
        onDepartmentChange={(dept) => { setDepartmentFilter(dept); setCurrentPage(1); }}
        showFilmCharges={showFilmCharges}
        onToggleShowFilmCharges={setShowFilmCharges}
        filmChargesHiddenCount={stats?.filmChargesHiddenCount}
        advancedFilters={advancedFilters}
        onAdvancedChange={(patch) => {
          setAdvancedFilters((prev: any) => ({ ...prev, ...patch }));
          setCurrentPage(1);
        }}
        onReset={() => handleReset()}
        totalFilteredCount={cases.length}
        totalCount={totalCount}
      />

      {/* View Switcher based on Active Tab */}
      {tabFilter === 'tracking' ? (
        <HmisTrackingPanel />
      ) : tabFilter === 'published' ? (
        <HmisPublishedPanel defaultQuery={searchQuery} onTrackAccession={(acc) => setSearchQuery(acc)} />
      ) : tabFilter === 'tat' ? (
        <HmisTatPanel defaultAccession={searchQuery} />
      ) : (
        <WorklistReportingView
          cases={cases}
          loading={loading}
          totalCount={totalCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          isArchive={tabFilter === 'archive'}
          isAllSelected={Boolean(isAllSelected)}
          selectedAccessions={selectedAccessions}
          sortField={sortField}
          sortDirection={sortDirection}
          searchQuery={searchQuery}
          syncingHmis={syncingHmis}
          trackingId={trackingId}
          updatingId={updatingId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSelect={handleToggleSelect}
          onSort={handleSort}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          onStatusChange={handleStatusChange}
          onOpenReportModal={(st) => setSelectedReportStudy(st)}
          onOpenMergeModal={(st) => setMergeStudy(st)}
          onOpenPendingModal={(st) => setPendingModalStudy(st)}
          onEditPatient={(st) => setEditingStudy(st)}
          onDeleteCase={(st) => setDeletingStudy(st)}
          onShareCase={(st) => setSharingStudy(st)}
          onFilterPatientMrn={(mrn) => setSearchQuery(mrn)}
          onClaimCase={handleClaimCase}
          onReleaseCase={handleReleaseCase}
          onTrackCase={handleTrackCase}
          onRefresh={fetchCases}
          onSyncHmis={handleSyncHmis}
          activeDateRange={advancedFilters.dateRange}
          onSearchAllDates={() => {
            setAdvancedFilters((prev: any) => ({ ...prev, dateRange: 'all' }));
            setCurrentPage(1);
          }}
        />
      )}

      {/* Floating Selection & WhatsApp Handover Bar */}
      <WorklistSelectionBar
        selectedCases={selectedCasesList}
        onClearSelection={() => setSelectedAccessions(new Set())}
        onClaimSelected={handleBatchClaimCases}
        onRemoveSelected={async (accs) => {
          await handleBatchDeleteCases(accs);
          setSelectedAccessions(new Set());
        }}
        onBatchStatusChange={handleBatchStatus}
        currentUserId={currentUserId ?? undefined}
      />

      {/* All Worklist Modals (Report, Manual Case, Edit, Merge, Delete) */}
      <WorklistModals
        selectedReportStudy={selectedReportStudy}
        onCloseReportModal={() => setSelectedReportStudy(null)}
        onReportSaved={(updated) => {
          setCases((prev: PacsStudyResult[]) =>
            prev.map((c) => (c.accessionNumber === updated.accessionNumber ? { ...c, ...updated } : c))
          );
        }}
        isManualModalOpen={isManualModalOpen}
        onCloseManualModal={() => setIsManualModalOpen(false)}
        onCaseCreated={(newCase, openInModal) => {
          setCases((prev: PacsStudyResult[]) => [newCase, ...prev]);
          setTotalCount((t: number) => t + 1);
          if (openInModal) setSelectedReportStudy(newCase);
        }}
        editingStudy={editingStudy}
        onCloseEditModal={() => setEditingStudy(null)}
        onPatientUpdated={(updatedStudy) => {
          setCases((prev: PacsStudyResult[]) =>
            prev.map((c) =>
              c.accessionNumber.toUpperCase() === updatedStudy.accessionNumber.toUpperCase() ||
              (c.studyId && c.studyId === updatedStudy.studyId) ? { ...c, ...updatedStudy } : c
            )
          );
        }}
        mergeStudy={mergeStudy}
        onCloseMergeModal={() => setMergeStudy(null)}
        onMergeSuccess={() => handleReset()}
        deletingStudy={deletingStudy}
        onCloseDeleteModal={() => setDeletingStudy(null)}
        onConfirmDelete={handleConfirmDelete}
        pendingModalStudy={pendingModalStudy}
        onClosePendingModal={() => setPendingModalStudy(null)}
        onPendingSaved={() => fetchCases()}
        currentUserId={currentUserId}
        onClaimCase={handleClaimCase}
      />

      {/* HMIS Settings Modal */}
      <WorklistHmisSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        autoSyncEnabled={Boolean(autoSyncEnabled)}
        onToggleAutoSync={setAutoSyncEnabled}
      />

      {/* Secure Consultant Share Modal */}
      {sharingStudy && (
        <CaseShareModal
          isOpen={Boolean(sharingStudy)}
          onClose={() => setSharingStudy(null)}
          studyId={sharingStudy.studyId || ''}
          accessionNumber={sharingStudy.accessionNumber}
          modality={sharingStudy.modality}
          patientName={sharingStudy.patientName}
        />
      )}
    </div>
  );
}
