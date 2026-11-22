'use client';

import React from 'react';
import { ReportRevisionDrawer } from './report-revision-drawer';
import { ZenSaveTemplateModal } from './zen-save-template-modal';
import { HmisSubmitConfirmModal } from './hmis-submit-confirm-modal';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';

interface ZenReportCanvasModalsProps {
  isHistoryOpen: boolean;
  onCloseHistory: () => void;
  reportId?: string;
  studyId: string;
  accessionNumber?: string;
  currentVersion?: number;
  onVersionChange?: (v: number) => void;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  isSaveTemplateOpen: boolean;
  onCloseSaveTemplate: () => void;
  modality: string;
  studyDescription?: string;
  report: ReportEditorState;
  isSubmitConfirmOpen?: boolean;
  onCloseSubmitConfirm?: () => void;
  onConfirmSubmit?: () => void;
  submittingHmis?: boolean;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientMrn?: string;
  pgrName?: string;
  consultantName?: string;
  initialDiffOpen?: boolean;
}

export function ZenReportCanvasModals({
  isHistoryOpen,
  onCloseHistory,
  reportId,
  studyId,
  accessionNumber,
  currentVersion = 1,
  onVersionChange,
  setReport,
  isSaveTemplateOpen,
  onCloseSaveTemplate,
  modality,
  studyDescription,
  report,
  isSubmitConfirmOpen = false,
  onCloseSubmitConfirm,
  onConfirmSubmit,
  submittingHmis = false,
  patientName,
  patientAge,
  patientGender,
  patientMrn,
  pgrName,
  consultantName,
  initialDiffOpen = false,
}: ZenReportCanvasModalsProps) {
  return (
    <>
      <ReportRevisionDrawer
        isOpen={isHistoryOpen}
        onClose={onCloseHistory}
        initialDiffOpen={initialDiffOpen}
        reportId={reportId || accessionNumber || studyId}
        currentVersion={currentVersion || 1}
        activeFindings={report.findings || ''}
        activeImpression={report.impression || ''}
        pgrDraftFindings={(report as any).pgrDraftFindings}
        pgrDraftImpression={(report as any).pgrDraftImpression}
        sidebarFindings={
          report.discussionJson && typeof report.discussionJson === 'object'
            ? (report.discussionJson as any).positiveFindings || []
            : []
        }
        consultantNotes={
          report.discussionJson && typeof report.discussionJson === 'object'
            ? (report.discussionJson as any).consultantNotes || ''
            : ''
        }
        onRestoreRevision={(restored) => {
          setReport((prev) => ({
            ...prev,
            findings: restored.findings || '',
            impression: restored.impression || '',
            technique: restored.technique || '',
            recommendation: restored.recommendation || '',
          }));
          if (restored.version) {
            onVersionChange?.(restored.version);
          }
        }}
      />

      <ZenSaveTemplateModal
        isOpen={isSaveTemplateOpen}
        onClose={onCloseSaveTemplate}
        modality={modality}
        initialTitle={studyDescription ? `${studyDescription} Protocol` : `${modality} Custom Template`}
        initialTechnique={report.technique}
        initialFindings={report.findings}
        initialImpression={report.impression}
      />

      {isSubmitConfirmOpen && onCloseSubmitConfirm && onConfirmSubmit && (
        <HmisSubmitConfirmModal
          isOpen={isSubmitConfirmOpen}
          onClose={onCloseSubmitConfirm}
          onConfirm={onConfirmSubmit}
          isSubmitting={submittingHmis}
          patientName={patientName}
          patientAge={patientAge}
          patientGender={patientGender}
          patientMrn={patientMrn}
          accessionNumber={accessionNumber}
          modality={modality}
          studyDescription={studyDescription}
          pgrName={pgrName}
          consultantName={consultantName}
          impression={report.impression}
        />
      )}
    </>
  );
}
