'use client';

import React from 'react';
import { TemplateManagerModal } from '@/components/templates/template-manager-modal';
import { MorningRoundsDiff } from './morning-rounds-diff';
import { LghReportModal } from '@/components/reports/lgh-report-modal';
import { PendingReasonModal } from './pending-reason-modal';
import { CrossSectionalTemplate, HmisNormalTemplate } from '@/types/templates';

interface WorkstationModalsProps {
  showTemplateModal: boolean;
  setShowTemplateModal: (show: boolean) => void;
  showMorningDiff: boolean;
  setShowMorningDiff: (show: boolean) => void;
  showOfficialModal: boolean;
  setShowOfficialModal: (show: boolean) => void;
  showPendingModal?: boolean;
  setShowPendingModal?: (show: boolean) => void;
  onPendingSaved?: (reason: string | null, notes: string | null) => void;
  study: any;
  patient: any;
  report: any;
  pgrName: string;
  onPgrNameChange: (name: string) => void;
  consultantName: string;
  onConsultantNameChange: (name: string) => void;
  onApplyTemplate: (tpl: CrossSectionalTemplate | HmisNormalTemplate) => void;
  onSave: (status?: string) => void;
  onSendToHmis: () => void;
  sendingHmis: boolean;
  modality?: string;
}

export function WorkstationModals({
  showTemplateModal,
  setShowTemplateModal,
  showMorningDiff,
  setShowMorningDiff,
  showOfficialModal,
  setShowOfficialModal,
  showPendingModal = false,
  setShowPendingModal,
  onPendingSaved,
  study,
  patient,
  report,
  pgrName,
  onPgrNameChange,
  consultantName,
  onConsultantNameChange,
  onApplyTemplate,
  onSave,
  onSendToHmis,
  sendingHmis,
  modality = 'CT',
}: WorkstationModalsProps) {
  return (
    <>
      <TemplateManagerModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApplyTemplate={onApplyTemplate}
        initialModality={modality}
      />

      <MorningRoundsDiff
        isOpen={showMorningDiff}
        onClose={() => setShowMorningDiff(false)}
        pgrDraftFindings={report.pgrDraftFindings || report.findings}
        consultantFindings={report.findings}
        pgrDraftImpression={report.pgrDraftImpression || report.impression}
        consultantImpression={report.impression}
        onApproveAndLock={() => {
          onSave('final');
          setShowMorningDiff(false);
        }}
        onRevertToPgr={() => setShowMorningDiff(false)}
      />

      {setShowPendingModal && (
        <PendingReasonModal
          isOpen={showPendingModal}
          onClose={() => setShowPendingModal(false)}
          reportId={report.id}
          studyId={study.id}
          accessionNumber={study.accessionNumber}
          currentReason={report.pendingReason}
          currentNotes={report.pendingNotes}
          onPendingSaved={(reason, notes) => {
            onPendingSaved?.(reason, notes);
          }}
        />
      )}

      <LghReportModal
        isOpen={showOfficialModal}
        onClose={() => setShowOfficialModal(false)}
        study={{ ...study, modality }}
        patient={patient}
        report={report}
        pgrName={pgrName}
        onPgrNameChange={onPgrNameChange}
        consultantName={consultantName}
        onConsultantNameChange={onConsultantNameChange}
        onSendToHmis={onSendToHmis}
        sendingHmis={sendingHmis}
      />
    </>
  );
}

