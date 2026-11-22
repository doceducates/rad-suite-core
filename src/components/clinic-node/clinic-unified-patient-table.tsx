'use client';

import React, { useMemo } from 'react';
import { RefreshCw, HardDrive } from 'lucide-react';
import { TablePagination } from '@/components/ui/table-pagination';
import type { LocalResidentStudy, ClinicActionType } from '@/services/clinic-node.service';
import { ClinicPatientRow } from './clinic-patient-row';
import { ClinicPatientFilters } from './clinic-patient-filters';
import { ClinicBatchActionsBar } from './clinic-batch-actions-bar';
import { useClinicPatientCatalog } from './use-clinic-patient-catalog';

interface ClinicUnifiedPatientTableProps {
  localStudies?: LocalResidentStudy[];
  syncedStudies?: any[];
  onAction?: (action: ClinicActionType, payload?: any) => Promise<void>;
  onRefreshNode?: () => void;
  loadingNode?: boolean;
  selectedNodeId?: string;
}

export function ClinicUnifiedPatientTable({
  localStudies = [],
  syncedStudies = [],
  onAction,
  onRefreshNode,
  loadingNode = false,
  selectedNodeId,
}: ClinicUnifiedPatientTableProps) {
  const {
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
  } = useClinicPatientCatalog({
    localStudies,
    syncedStudies,
    onAction,
    onRefreshNode,
    selectedNodeId,
  });

  const totalSandboxSizeMb = useMemo(() => {
    return localStudies.reduce((acc, st) => acc + (st.sizeMb || 0), 0);
  }, [localStudies]);

  const formattedSandboxSize = useMemo(() => {
    if (totalSandboxSizeMb <= 0) return '0 MB';
    if (totalSandboxSizeMb >= 1024) return `${(totalSandboxSizeMb / 1024).toFixed(1)} GB`;
    return `${Math.round(totalSandboxSizeMb)} MB`;
  }, [totalSandboxSizeMb]);

  const unsyncedSandboxCount = useMemo(() => {
    return localStudies.filter((s) => !s.isSyncedToS3 && s.state !== 'synced').length;
  }, [localStudies]);

  const allOnPageSelected = paginatedStudies.length > 0 && paginatedStudies.every((s) => selectedAccessions.has(s.accessionNumber));

  return (
    <div className="space-y-3.5 text-xs font-sans">
      <ClinicPatientFilters
        search={search}
        setSearch={(val) => { setSearch(val); setCurrentPage(1); }}
        modality={modality}
        setModality={(val) => { setModality(val); setCurrentPage(1); }}
        datePreset={datePreset}
        customFrom={customFrom}
        customTo={customTo}
        onDateChange={handleDateChange}
        stageFilter={stageFilter}
        setStageFilter={(val) => { setStageFilter(val); setCurrentPage(1); }}
        pullAccInput={pullAccInput}
        setPullAccInput={setPullAccInput}
        isPulling={pullingAcc !== null}
        onPullStudy={(acc) => handlePullStudy(acc)}
        onQueryScanner={handleQueryScanner}
        loading={loadingNode}
        isQueryingScanner={isQueryingScanner}
        unsyncedCount={unsyncedSandboxCount}
        onSyncAll={() => handleBatchUpload()}
        syncingAll={isBatchProcessing}
      />

      {/* Batch Actions Bar */}
      <ClinicBatchActionsBar
        selectedCount={selectedAccessions.size}
        unsyncedCount={unsyncedSelectedCount}
        localCount={localSelectedCount}
        pacsOnlyCount={pacsOnlySelectedCount}
        onBatchUpload={handleBatchUpload}
        onBatchPurge={handleBatchPurge}
        onBatchPull={handleBatchPull}
        onClearSelection={() => setSelectedAccessions(new Set())}
        isProcessing={isBatchProcessing}
      />

      {/* Single Patient & Storage Table Container with Sticky Header & Sticky Pagination */}
      <div className="flex flex-col border border-border/70 rounded-2xl bg-card overflow-hidden shadow-xs text-xs max-h-[calc(100vh-16rem)] min-h-[420px]">
        {/* Sub-Header Strip: Study Counts & Sandbox Disk Telemetry */}
        <div className="px-3.5 py-2 border-b border-border/60 bg-surface-container/30 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground shrink-0 select-none">
          <span>
            Showing <strong className="text-foreground">{filteredStudies.length}</strong> of{' '}
            <strong className="text-foreground">{allMergedStudies.length}</strong> managed studies
          </span>
          <span className="font-mono text-[11px] flex items-center gap-1.5 text-muted-foreground">
            <HardDrive className="w-3.5 h-3.5 text-primary" />
            <span>Sandbox Disk: <strong className="text-foreground">{localStudies.length}</strong> cases ({formattedSandboxSize})</span>
          </span>
        </div>

        {/* Scrollable Table Viewport with Sticky Header */}
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-surface-container/95 dark:bg-surface-container-high/95 backdrop-blur-md border-b border-border text-[11px] font-semibold text-muted-foreground select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center bg-inherit">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary cursor-pointer w-3.5 h-3.5"
                    title="Select all on this page"
                  />
                </th>
                <th className="py-2.5 px-3 bg-inherit">Patient</th>
                <th className="py-2.5 px-3 bg-inherit">Modality</th>
                <th className="py-2.5 px-3 bg-inherit">Description</th>
                <th className="py-2.5 px-3 bg-inherit">Accession</th>
                <th className="py-2.5 px-3 bg-inherit">Date / Slices</th>
                <th className="py-2.5 px-3 bg-inherit">Storage Status</th>
                <th className="py-2.5 px-3 text-right bg-inherit">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loadingNode && filteredStudies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Synchronizing Medical Sandbox cases &amp; telemetry...
                  </td>
                </tr>
              ) : paginatedStudies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-muted-foreground">
                    No studies found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudies.map((st) => (
                  <ClinicPatientRow
                    key={`${st.id}_${st.accessionNumber}`}
                    study={st}
                    isSelected={selectedAccessions.has(st.accessionNumber)}
                    onToggleSelect={handleToggleSelect}
                    isPulling={pullingAcc === st.accessionNumber}
                    isUploading={isStudyUploading(st.accessionNumber)}
                    isPurging={purgingAcc === st.accessionNumber}
                    onPull={handlePullStudy}
                    onUpload={handleUploadStudy}
                    onPurge={handlePurgeStudy}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Pagination Footer pinned at the bottom */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={filteredStudies.length}
          itemName="studies"
          sticky={true}
          className="border-t border-border/70 shrink-0"
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
