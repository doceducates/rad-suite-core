'use client';

// Layer 4 (Presentation): HMIS Proceeded Patients Worklist View (<260 lines)
import React, { useState } from 'react';
import { HmisPatientRowItem } from './hmis-patient-row-item';
import { HmisClaimPromptModal } from './hmis-claim-prompt-modal';
import { WorklistSortHeader } from './worklist-sort-header';
import { TablePagination } from '@/components/ui/table-pagination';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { WorklistPatientTracer } from './worklist-patient-tracer';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistReportingViewProps {
  cases: PacsStudyResult[];
  loading: boolean;
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  isArchive?: boolean;
  isAllSelected: boolean;
  selectedAccessions: Set<string>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  syncingHmis: boolean;
  trackingId: string | null;
  updatingId: string | null;
  currentUserId?: string | null;
  currentUserName?: string | null;
  onToggleSelectAll: () => void;
  onToggleSelect: (acc: string) => void;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onStatusChange: (reportId: string | undefined, studyId: string | undefined, newStatus: string, accessionNumber?: string | undefined) => void;
  onOpenReportModal: (st: PacsStudyResult) => void;
  onOpenMergeModal: (st: PacsStudyResult) => void;
  onOpenPendingModal: (st: PacsStudyResult) => void;
  onEditPatient: (st: PacsStudyResult) => void;
  onDeleteCase: (st: PacsStudyResult) => void;
  onShareCase?: (st: PacsStudyResult) => void;
  onFilterPatientMrn: (mrn: string) => void;
  onClaimCase: (acc: string) => Promise<boolean>;
  onReleaseCase: (acc: string) => Promise<boolean>;
  onTrackCase: (acc: string) => Promise<void>;
  onRefresh: () => void;
  onSyncHmis: (opts?: any) => Promise<void>;
  activeDateRange?: string;
  onSearchAllDates?: () => void;
}

export function WorklistReportingView({
  cases,
  loading,
  totalCount,
  pageSize,
  currentPage,
  totalPages,
  isArchive = false,
  isAllSelected,
  selectedAccessions,
  sortField,
  sortDirection,
  searchQuery,
  syncingHmis,
  trackingId,
  updatingId,
  currentUserId,
  currentUserName,
  onToggleSelectAll,
  onToggleSelect,
  onSort,
  onPageChange,
  onPageSizeChange,
  onStatusChange,
  onOpenReportModal,
  onOpenMergeModal,
  onOpenPendingModal,
  onEditPatient,
  onDeleteCase,
  onShareCase,
  onFilterPatientMrn,
  onClaimCase,
  onReleaseCase,
  onTrackCase,
  onRefresh,
  onSyncHmis,
  activeDateRange,
  onSearchAllDates,
}: WorklistReportingViewProps) {
  const [pendingClaimStudy, setPendingClaimStudy] = useState<PacsStudyResult | null>(null);
  const [claimingModal, setClaimingModal] = useState(false);

  const handleConfirmClaimAndReport = async () => {
    if (!pendingClaimStudy) return;
    setClaimingModal(true);
    try {
      const ok = await onClaimCase(pendingClaimStudy.accessionNumber);
      if (ok) {
        const target = pendingClaimStudy;
        setPendingClaimStudy(null);
        onOpenReportModal(target);
      }
    } finally {
      setClaimingModal(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col rounded-xl border border-outline-variant/60 bg-card shadow-xs overflow-hidden h-[calc(100dvh-15.5rem)] min-h-[340px] relative">
        {loading && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center z-20">
            <span className="text-xs font-semibold text-primary animate-pulse">Loading cases...</span>
          </div>
        )}

        {/* Scrollable Table Viewport with Anchored Header and Pagination */}
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 border-b border-outline-variant/60 text-secondary bg-surface-container-low/95 backdrop-blur-xs uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={Boolean(isAllSelected)}
                    onChange={onToggleSelectAll}
                    className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
                    aria-label="Select all cases on page"
                  />
                </th>
                <WorklistSortHeader
                  label="Order & Intake"
                  field="date"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                  className="min-w-[130px]"
                />
                <WorklistSortHeader
                  label="Patient Demographics"
                  field="patient"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                  className="min-w-[170px]"
                />
                <WorklistSortHeader
                  label="Referring & Clinic"
                  field="department"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                  className="min-w-[160px]"
                />
                <WorklistSortHeader
                  label="Investigation & Accession"
                  field="modality"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                  className="min-w-[180px]"
                />
                <WorklistSortHeader
                  label="HMIS Status & Claim"
                  field="status"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={onSort}
                  className="min-w-[140px]"
                />
                <th className="py-3 px-4 text-right w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {/* Smart Patient Journey Tracer Row - placed cleanly below sticky <thead> */}
              <WorklistPatientTracer
                searchQuery={searchQuery}
                onOpenReportModal={onOpenReportModal}
                onSyncHmis={onSyncHmis}
                syncingHmis={syncingHmis}
                variant="row"
                colSpan={7}
              />

              {cases.map((study: PacsStudyResult, idx: number) => (
                <HmisPatientRowItem
                  key={`${study.accessionNumber}-${study.source || 'local'}-${study.localCaseId || study.studyId || idx}`}
                  study={study}
                  isSelected={selectedAccessions.has(study.accessionNumber)}
                  onToggleSelect={onToggleSelect}
                  onClaimCase={onClaimCase}
                  onReleaseCase={onReleaseCase}
                  onOpenReportModal={onOpenReportModal}
                  onRequestClaimModal={(st) => setPendingClaimStudy(st)}
                  onTrackCase={onTrackCase}
                  trackingCase={Boolean(trackingId && trackingId.toLowerCase() === study.accessionNumber.toLowerCase())}
                  currentUserId={currentUserId}
                  onDeleteCase={onDeleteCase}
                  onShareCase={onShareCase}
                />
              ))}
            </tbody>
          </table>

          {cases.length === 0 && !loading && (
            <div className="p-12 text-center text-secondary">
              <p className="font-semibold text-on-surface">No diagnostic cases found in local index</p>
              <p className="text-xs mt-1">Try adjusting your search criteria, modality filter, or date range.</p>
              {searchQuery && activeDateRange && activeDateRange !== 'all' && onSearchAllDates && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onSearchAllDates}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-primary/40 text-primary text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                  >
                    <span>🔍 Search &quot;{searchQuery}&quot; across all dates</span>
                  </button>
                </div>
              )}
              {syncingHmis ? (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-primary animate-pulse font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching HMIS portal in the background...</span>
                </div>
              ) : searchQuery && onSyncHmis ? (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => onSyncHmis({ query: searchQuery })}
                    className="gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Search & Pull &quot;{searchQuery}&quot; from HMIS Portal</span>
                  </Button>
                  <p className="text-[11px] text-secondary/70">Case may not have synced to the local workstation database yet.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
          itemName="cases"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>

      {/* Claim confirmation modal for unassigned cases before opening report editor */}
      <HmisClaimPromptModal
        isOpen={Boolean(pendingClaimStudy)}
        study={pendingClaimStudy}
        claiming={claimingModal}
        onClose={() => setPendingClaimStudy(null)}
        onConfirmClaimAndReport={handleConfirmClaimAndReport}
      />
    </div>
  );
}
