'use client';

// Layer 4 (Presentation): My Cases Batch Selection Floating Toolbar
// Strict File Size Invariant: Target < 250 lines

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Check,
  X,
  Loader2,
  UserMinus,
} from 'lucide-react';
import { WorklistWhatsappModal } from '@/components/worklist/worklist-whatsapp-modal';
import { HmisDispatchOptionsModal } from '@/components/hmis/hmis-dispatch-options-modal';
import { HmisBatchRevertModal } from './hmis-batch-revert-modal';
import { HmisSplitActionButton } from './hmis-split-action-button';
import { WorklistStatusActionMenu } from '@/components/worklist/worklist-status-action-menu';
import { formatWhatsappHandover } from '@/lib/whatsapp-handover';
import { enqueueHmisDrafts } from '@/services/hmis/hmis-background-queue.service';
import { enqueueHmisBatchRevert } from '@/services/hmis/hmis-batch-revert.service';
import { notify } from '@/services/notification.service';
import { config } from '@/lib/config';
import type { PacsStudyResult } from '@/types/pacs';

function WhatsAppIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.075-2.228-.553-1.831-.753-3.003-2.625-3.094-2.748-.09-.123-.746-.992-.746-1.893 0-.901.472-1.344.641-1.528.169-.184.37-.23.493-.23.123 0 .247 0 .354.006.113.007.264-.043.413.315.155.372.53 1.293.576 1.386.046.092.077.2.015.323-.062.123-.093.2-.185.308-.092.108-.195.24-.278.323-.092.092-.188.193-.081.377.108.185.479.79 1.028 1.278.708.631 1.305.826 1.49.918.185.092.293.077.401-.046.108-.123.462-.538.585-.723.123-.185.246-.154.415-.092.17.061 1.079.508 1.264.6.185.092.308.138.354.215.046.077.046.446-.098.851zM12.042 2C6.505 2 2.016 6.488 2.016 12.025c0 2.016.597 3.904 1.634 5.503L2.016 22l4.634-1.589c1.551.928 3.359 1.458 5.392 1.458 5.536 0 10.024-4.488 10.024-10.025C22.066 6.488 17.578 2 12.042 2z" />
    </svg>
  );
}

interface MyCasesSelectionBarProps {
  selectedCases: PacsStudyResult[];
  onClearSelection: () => void;
  onReleaseSelected?: (accessions: string[]) => Promise<any> | void;
  onBatchStatusChange?: (status: string) => Promise<any> | void;
  currentUserName?: string;
  onRefresh?: () => void;
}

export function MyCasesSelectionBar({
  selectedCases,
  onClearSelection,
  onReleaseSelected,
  onBatchStatusChange,
  currentUserName,
  onRefresh,
}: MyCasesSelectionBarProps) {
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [isDispatchOptionsOpen, setIsDispatchOptionsOpen] = useState(false);
  const [isSubmitOptionsOpen, setIsSubmitOptionsOpen] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isFinalSubmitAllowed = Boolean(config.hmisAllowFinalSubmit);

  if (selectedCases.length === 0) return null;

  const handleConfirmBatchRevert = () => {
    enqueueHmisBatchRevert(selectedCases, {
      onComplete: () => {
        onRefresh?.();
      },
    });
    onClearSelection();
  };

  const handleConfirmBatchDispatch = ({ deepVerify, action = 'draft' }: { deepVerify: boolean; action?: 'draft' | 'submit' }) => {
    enqueueHmisDrafts(
      selectedCases.map((c) => ({
        studyId: c.studyId,
        accessionNumber: c.accessionNumber,
        patientMrn: c.patientMrn,
        patientName: c.patientName,
        patientId: c.patientId,
        scanType: c.scanType,
        modality: c.modality,
        bodyPart: c.bodyPart,
        studyDescription: c.studyDescription,
        clinicalHistory: c.clinicalHistory,
        hmisCpt: c.hmisCpt,
        hmisInvestigationId: c.hmisInvestigationId,
      })),
      {
        doctorName: currentUserName,
        deepVerify,
        action,
        originPath: typeof window !== 'undefined' ? window.location.pathname : '',
        onComplete: () => {
          onRefresh?.();
        },
      }
    );
    onClearSelection();
  };

  const handleReleaseAll = async () => {
    if (!onReleaseSelected) return;
    setReleasing(true);
    try {
      await onReleaseSelected(selectedCases.map((c) => c.accessionNumber));
      notify.info(`${selectedCases.length} case(s) released back to HMIS patients worklist.`);
      onClearSelection();
    } catch (err: any) {
      notify.error(`Failed releasing cases: ${err.message || 'Unknown error'}`);
    } finally {
      setReleasing(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!onBatchStatusChange || !status) return;
    setUpdatingStatus(true);
    try {
      await onBatchStatusChange(status);
      notify.success(`Status updated for ${selectedCases.length} case(s).`);
    } catch (err: any) {
      notify.error(`Failed updating status: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleQuickCopy = async () => {
    let casesToCopy = selectedCases;
    try {
      const res = await fetch('/api/worklist/sync-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: selectedCases.map((c) => c.accessionNumber) }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.cases)) {
        casesToCopy = selectedCases.map((c) => {
          const match = data.cases.find(
            (sc: any) => sc.accessionNumber?.toUpperCase() === c.accessionNumber?.toUpperCase()
          );
          if (!match) return c;
          return {
            ...c,
            status: match.status || c.status,
            hmisStatus: match.hmisStatus || c.hmisStatus,
            impression: match.impression || c.impression,
            diagnosisHighlight: match.diagnosisHighlight || c.diagnosisHighlight,
            pendingReason: match.pendingReason !== undefined ? match.pendingReason : c.pendingReason,
            pendingNotes: match.pendingNotes !== undefined ? match.pendingNotes : c.pendingNotes,
          };
        });
      }
    } catch {}

    const text = formatWhatsappHandover(casesToCopy, {
      doctorName: currentUserName || 'Resident Radiologist',
      includeDiagnosisHighlights: true,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedQuick(true);
      notify.info('Clinical summary copied (live synced)');
      setTimeout(() => setCopiedQuick(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedQuick(true);
      notify.info('Clinical summary copied (live synced)');
      setTimeout(() => setCopiedQuick(false), 2000);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[96vw] sm:max-w-2xl w-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-card/95 backdrop-blur-md border border-primary/40 rounded-xl sm:rounded-2xl shadow-xl shadow-black/20 text-on-surface animate-in fade-in slide-in-from-bottom-3 duration-200 overflow-visible">
          {/* Badge & Info: Pure count number */}
          <div className="flex items-center pr-1.5 sm:pr-2 border-r border-outline-variant/50 shrink-0">
            <span
              className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary/20 text-primary font-bold text-xs"
              title={`${selectedCases.length} selected`}
            >
              {selectedCases.length}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* HMIS Actions: Split Button with Chevron Menu */}
            <HmisSplitActionButton
              onSaveDrafts={() => setIsDispatchOptionsOpen(true)}
              onRevertToBlank={() => setIsRevertModalOpen(true)}
              onSubmitFinal={() => setIsSubmitOptionsOpen(true)}
              isFinalSubmitAllowed={isFinalSubmitAllowed}
            />

            {/* WhatsApp Share (Icon only, emerald theme) */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsWhatsappOpen(true)}
              className="h-7.5 sm:h-8 w-7.5 sm:w-8 p-0 bg-emerald-600/15 hover:bg-emerald-600 hover:text-white border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
              title="Share formatted clinical report handover via WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
            </Button>

            {/* Status Change Dropdown Menu */}
            {onBatchStatusChange && (
              <WorklistStatusActionMenu
                direction="up"
                triggerMode="button"
                placeholder="Status"
                disabled={updatingStatus}
                onChange={handleStatusUpdate}
              />
            )}

            {/* Release to Pool */}
            {onReleaseSelected && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={releasing}
                onClick={handleReleaseAll}
                className="gap-1 text-xs h-7.5 sm:h-8 px-2 sm:px-2.5 border-outline-variant/60 hover:text-error hover:bg-error/10 cursor-pointer shrink-0"
                title="Unclaim and release cases back to general HMIS patients worklist pool"
              >
                {releasing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserMinus className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Release</span>
              </Button>
            )}

            {/* Quick Copy Summary (Icon only) */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleQuickCopy}
              className="h-7.5 sm:h-8 w-7.5 sm:w-8 p-0 cursor-pointer border-outline-variant/60 hover:bg-surface-container shrink-0 flex items-center justify-center shadow-xs"
              title="Copy clinical summary to clipboard"
            >
              {copiedQuick ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-secondary" />}
            </Button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={onClearSelection}
              aria-label="Clear selection"
              className="p-1 sm:p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      <WorklistWhatsappModal
        isOpen={isWhatsappOpen}
        onClose={() => setIsWhatsappOpen(false)}
        selectedCases={selectedCases}
        currentUserName={currentUserName}
      />

      <HmisDispatchOptionsModal
        isOpen={isDispatchOptionsOpen}
        onClose={() => setIsDispatchOptionsOpen(false)}
        caseCount={selectedCases.length}
        caseLabels={selectedCases.map((c) => `${c.patientName} (${c.accessionNumber})`)}
        onConfirm={handleConfirmBatchDispatch}
      />

      <HmisDispatchOptionsModal
        isOpen={isSubmitOptionsOpen}
        onClose={() => setIsSubmitOptionsOpen(false)}
        caseCount={selectedCases.length}
        caseLabels={selectedCases.map((c) => `${c.patientName} (${c.accessionNumber})`)}
        mode="submit"
        onConfirm={(opts) => handleConfirmBatchDispatch({ ...opts, action: 'submit' })}
      />

      <HmisBatchRevertModal
        isOpen={isRevertModalOpen}
        onClose={() => setIsRevertModalOpen(false)}
        selectedCases={selectedCases}
        onConfirm={handleConfirmBatchRevert}
      />
    </>
  );
}
