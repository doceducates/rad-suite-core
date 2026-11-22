'use client';

// Layer 4 (Presentation): Dedicated "My Cases" Reporting Workstation Table
// Strict File Size Invariant: Target < 250 lines, Max 350 lines

import React, { useState } from 'react';
import { WorklistRowItem } from '@/components/worklist/worklist-row-item';
import { WorklistReportModal } from '@/components/worklist/worklist-report-modal';
import { LghReportModal } from '@/components/reports/lgh-report-modal';
import { WorklistManualCaseModal } from '@/components/worklist/worklist-manual-case-modal';
import { WorklistEditPatientModal } from '@/components/worklist/worklist-edit-patient-modal';
import { WorklistMergeModal } from '@/components/worklist/worklist-merge-modal';
import { PendingReasonModal } from '@/components/editor/pending-reason-modal';
import { MyCasesSelectionBar } from './my-cases-selection-bar';
import { MyCasesFilterBar } from './my-cases-filter-bar';
import { WorklistSortHeader } from '@/components/worklist/worklist-sort-header';
import { TablePagination } from '@/components/ui/table-pagination';
import { CaseReleaseModal } from './case-release-modal';
import { RefreshCw } from 'lucide-react';
import { MyCasesCockpitHeader } from './my-cases-cockpit-header';
import { useMyCases } from '@/hooks/use-my-cases';
import type { PacsStudyResult } from '@/types/pacs';

interface MyCasesTableProps {
  initialCases: PacsStudyResult[];
  initialTotal: number;
  initialStats?: any;
  currentUserId?: string;
  currentUserName?: string;
}

export function MyCasesTable({
  initialCases = [],
  initialTotal = 0,
  initialStats,
  currentUserId,
  currentUserName,
}: MyCasesTableProps) {
  const {
    cases,
    totalCount,
    loading,
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
    syncMyCasesStatus,
    syncingMyStatus,
  } = useMyCases({ initialCases, initialTotal });

  // Dialog State
  const [selectedReportStudy, setSelectedReportStudy] = useState<PacsStudyResult | null>(null);
  const [officialReportStudy, setOfficialReportStudy] = useState<PacsStudyResult | null>(null);
  const [consultantName, setConsultantName] = useState('');
  const [editingStudy, setEditingStudy] = useState<PacsStudyResult | null>(null);
  const [mergeStudy, setMergeStudy] = useState<PacsStudyResult | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [pendingModalStudy, setPendingModalStudy] = useState<PacsStudyResult | null>(null);
  const [releaseModalStudy, setReleaseModalStudy] = useState<PacsStudyResult | null>(null);

  const prelimCount = cases.filter((c) => c.status === 'draft' || c.status === 'preliminary').length;
  const submittedCount = cases.filter((c) => c.status === 'submitted').length;
  const publishedCount = cases.filter((c) => c.status === 'final' || c.status === 'finalized').length;
  const statCount = cases.filter((c) => c.priority === 'stat').length;

  const handleTrackCurrentCases = () => {
    const accs =
      selectedAccessions.size > 0
        ? Array.from(selectedAccessions)
        : cases.map((c) => c.accessionNumber);
    syncMyCasesStatus(accs, false);
  };

  return (
    <div className="space-y-2.5 text-xs font-sans">
      <MyCasesCockpitHeader
        totalCount={totalCount}
        filteredCount={cases.length}
        selectedCount={selectedAccessions.size}
        prelimCount={prelimCount}
        submittedCount={submittedCount}
        publishedCount={publishedCount}
        statCount={statCount}
        activeStatus={status}
        onStatusChange={(s) => { setStatus(s); setCurrentPage(1); }}
        activePriority={priority}
        onPriorityChange={(p) => { setPriority(p); setCurrentPage(1); }}
        syncingMyStatus={syncingMyStatus}
        onTrackStatus={handleTrackCurrentCases}
        onRefresh={() => {
          fetchMyCases();
          syncMyCasesStatus(undefined, false);
        }}
        onOpenManualCaseModal={() => setIsManualModalOpen(true)}
      />

      <MyCasesFilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
        dateRange={dateRange}
        onDateRangeChange={(r) => { setDateRange(r); setCurrentPage(1); }}
        customFrom={customFrom}
        onCustomFromChange={(f) => { setCustomFrom(f); setCurrentPage(1); }}
        customTo={customTo}
        onCustomToChange={(t) => { setCustomTo(t); setCurrentPage(1); }}
        modality={modality}
        onModalityChange={(m) => { setModality(m); setCurrentPage(1); }}
        status={status}
        onStatusChange={(s) => { setStatus(s); setCurrentPage(1); }}
        priority={priority}
        onPriorityChange={(p) => { setPriority(p); setCurrentPage(1); }}
        department={department}
        onDepartmentChange={(d) => { setDepartment(d); setCurrentPage(1); }}
        bodyPart={bodyPart}
        onBodyPartChange={(b) => { setBodyPart(b); setCurrentPage(1); }}
        imagesReadyOnly={imagesReadyOnly}
        onToggleImagesReady={() => { setImagesReadyOnly((prev) => !prev); setCurrentPage(1); }}
        isFiltered={isFiltered}
        onResetFilters={handleResetFilters}
        loading={loading || syncingMyStatus}
        onRefresh={() => fetchMyCases()}
      />

      {/* Table Container */}
      <div className="flex flex-col rounded-2xl border border-outline-variant/60 bg-surface shadow-2xs overflow-hidden max-h-[calc(100vh-15rem)] min-h-[380px]">
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-container-low/95 backdrop-blur-xs border-b border-outline-variant/50 text-[11px] font-semibold text-secondary uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={Boolean(isAllSelected)}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all cases"
                    className="rounded border-outline-variant text-primary h-4 w-4 cursor-pointer align-middle"
                  />
                </th>
                <WorklistSortHeader label="Patient" field="patient_name" activeField={sortField} direction={sortDirection} onSort={handleSort} />
                <WorklistSortHeader label="Study" field="modality" activeField={sortField} direction={sortDirection} onSort={handleSort} />
                <WorklistSortHeader label="Taken (Scan Date)" field="date" activeField={sortField} direction={sortDirection} onSort={handleSort} />
                <WorklistSortHeader label="Status & Lifecycle" field="status" activeField={sortField} direction={sortDirection} onSort={handleSort} />
                <th className="py-2.5 px-4 text-right w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {loading && cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading your cases...</span>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary">
                    No cases found for the selected shift window and filters. Use the buttons above to adjust or reset.
                  </td>
                </tr>
              ) : (
                cases.map((study) => (
                  <WorklistRowItem
                    key={study.accessionNumber}
                    study={study}
                    isMyCases={true}
                    isSelected={selectedAccessions.has(study.accessionNumber)}
                    onToggleSelect={handleToggleSelect}
                    onOpenReportModal={setSelectedReportStudy}
                    onOpenOfficialReport={setOfficialReportStudy}
                    onOpenMergeModal={setMergeStudy}
                    onOpenPendingModal={setPendingModalStudy}
                    onEditPatient={setEditingStudy}
                    onReleaseCase={() => setReleaseModalStudy(study)}
                    onStatusChange={handleStatusChange}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    onRefresh={fetchMyCases}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize) || 1}
          totalCount={totalCount}
          pageSize={pageSize}
          itemName="cases"
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
        />
      </div>

      <MyCasesSelectionBar
        selectedCases={selectedCasesList}
        onClearSelection={() => setSelectedAccessions(new Set())}
        onReleaseSelected={handleBatchRelease}
        onBatchStatusChange={handleBatchStatus}
        currentUserName={currentUserName}
        onRefresh={fetchMyCases}
      />

      {isManualModalOpen && (
        <WorklistManualCaseModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onCaseCreated={(newCase, openInModal) => {
            fetchMyCases();
            if (openInModal) setSelectedReportStudy(newCase);
          }}
        />
      )}

      {selectedReportStudy && (
        <WorklistReportModal
          study={selectedReportStudy}
          isOpen={Boolean(selectedReportStudy)}
          onClose={() => setSelectedReportStudy(null)}
          onReportSaved={() => fetchMyCases()}
          currentUserId={currentUserId}
        />
      )}

      {officialReportStudy && (
        <LghReportModal
          isOpen={Boolean(officialReportStudy)}
          onClose={() => setOfficialReportStudy(null)}
          study={officialReportStudy}
          patient={{
            fullName: officialReportStudy.patientName,
            age: officialReportStudy.age,
            gender: officialReportStudy.gender,
            mrNumber: officialReportStudy.patientMrn || officialReportStudy.patientId,
            clinicalHistory: officialReportStudy.clinicalHistory,
          }}
          report={{
            id: officialReportStudy.reportId,
            findings: (officialReportStudy as any).findings || '',
            impression: officialReportStudy.impression || '',
            technique: (officialReportStudy as any).technique || '',
            clinicalHistory: officialReportStudy.clinicalHistory || '',
            status: officialReportStudy.status || 'final',
          }}
          pgrName={officialReportStudy.assignedRadiologistName || currentUserName || 'Resident Radiologist'}
          onPgrNameChange={() => {}}
          consultantName={consultantName}
          onConsultantNameChange={setConsultantName}
        />
      )}

      {pendingModalStudy && (
        <PendingReasonModal
          isOpen={Boolean(pendingModalStudy)}
          onClose={() => setPendingModalStudy(null)}
          reportId={pendingModalStudy.reportId}
          studyId={pendingModalStudy.studyId}
          accessionNumber={pendingModalStudy.accessionNumber}
          currentReason={pendingModalStudy.pendingReason}
          currentNotes={pendingModalStudy.pendingNotes}
          onPendingSaved={() => fetchMyCases()}
        />
      )}

      {editingStudy && (
        <WorklistEditPatientModal
          study={editingStudy}
          isOpen={Boolean(editingStudy)}
          onClose={() => setEditingStudy(null)}
          onPatientUpdated={() => fetchMyCases()}
        />
      )}

      {mergeStudy && (
        <WorklistMergeModal
          sourceStudy={mergeStudy}
          isOpen={Boolean(mergeStudy)}
          onClose={() => setMergeStudy(null)}
          onMergeSuccess={() => fetchMyCases()}
        />
      )}

      <CaseReleaseModal
        isOpen={Boolean(releaseModalStudy)}
        onClose={() => setReleaseModalStudy(null)}
        study={releaseModalStudy}
        onConfirm={() => {
          if (releaseModalStudy) {
            handleRelease(releaseModalStudy.accessionNumber);
          }
        }}
      />
    </div>
  );
}
