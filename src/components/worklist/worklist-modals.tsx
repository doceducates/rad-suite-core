'use client';

import React from 'react';
import { WorklistReportModal } from './worklist-report-modal';
import { WorklistManualCaseModal } from './worklist-manual-case-modal';
import { WorklistEditPatientModal } from './worklist-edit-patient-modal';
import { WorklistMergeModal } from './worklist-merge-modal';
import { WorklistDeleteDialog } from './worklist-delete-dialog';
import { PendingReasonModal } from '@/components/editor/pending-reason-modal';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistModalsProps {
  selectedReportStudy: PacsStudyResult | null;
  onCloseReportModal: () => void;
  onReportSaved: (updated: Partial<PacsStudyResult> & { accessionNumber: string }) => void;

  isManualModalOpen: boolean;
  onCloseManualModal: () => void;
  onCaseCreated: (newCase: PacsStudyResult, openInModal?: boolean) => void;

  editingStudy: PacsStudyResult | null;
  onCloseEditModal: () => void;
  onPatientUpdated: (updatedStudy: PacsStudyResult) => void;

  mergeStudy: PacsStudyResult | null;
  onCloseMergeModal: () => void;
  onMergeSuccess: (targetAcc: string) => void;

  deletingStudy: PacsStudyResult | null;
  onCloseDeleteModal: () => void;
  onConfirmDelete: (accession: string) => Promise<void>;

  pendingModalStudy?: PacsStudyResult | null;
  onClosePendingModal?: () => void;
  onPendingSaved?: () => void;

  currentUserId?: string;
  onClaimCase?: (accession: string) => Promise<any> | void;
}

export function WorklistModals({
  selectedReportStudy,
  onCloseReportModal,
  onReportSaved,
  isManualModalOpen,
  onCloseManualModal,
  onCaseCreated,
  editingStudy,
  onCloseEditModal,
  onPatientUpdated,
  mergeStudy,
  onCloseMergeModal,
  onMergeSuccess,
  deletingStudy,
  onCloseDeleteModal,
  onConfirmDelete,
  pendingModalStudy,
  onClosePendingModal,
  onPendingSaved,
  currentUserId,
  onClaimCase,
}: WorklistModalsProps) {
  return (
    <>
      {/* Quick In-Place Report Modal */}
      <WorklistReportModal
        study={selectedReportStudy}
        isOpen={Boolean(selectedReportStudy)}
        onClose={onCloseReportModal}
        onReportSaved={onReportSaved}
        currentUserId={currentUserId}
        onClaimCase={onClaimCase}
      />

      {/* Standalone Manual Case Modal */}
      <WorklistManualCaseModal
        isOpen={isManualModalOpen}
        onClose={onCloseManualModal}
        onCaseCreated={onCaseCreated}
      />

      {/* Clinical Pending Hold Reason Modal */}
      {pendingModalStudy && (
        <PendingReasonModal
          isOpen={Boolean(pendingModalStudy)}
          onClose={onClosePendingModal || (() => {})}
          reportId={pendingModalStudy.reportId}
          studyId={pendingModalStudy.studyId}
          accessionNumber={pendingModalStudy.accessionNumber}
          currentReason={pendingModalStudy.pendingReason}
          currentNotes={pendingModalStudy.pendingNotes}
          onPendingSaved={() => onPendingSaved?.()}
        />
      )}

      {/* Edit Patient & Study Details Modal */}
      <WorklistEditPatientModal
        isOpen={Boolean(editingStudy)}
        study={editingStudy}
        onClose={onCloseEditModal}
        onPatientUpdated={onPatientUpdated}
      />

      {/* 1-Click Manual Case Reconciliation & Merge Modal */}
      <WorklistMergeModal
        sourceStudy={mergeStudy}
        isOpen={Boolean(mergeStudy)}
        onClose={onCloseMergeModal}
        onMergeSuccess={onMergeSuccess}
      />

      {/* Delete Case Confirmation Modal */}
      <WorklistDeleteDialog
        study={deletingStudy}
        isOpen={Boolean(deletingStudy)}
        onClose={onCloseDeleteModal}
        onConfirmDelete={onConfirmDelete}
      />
    </>
  );
}
