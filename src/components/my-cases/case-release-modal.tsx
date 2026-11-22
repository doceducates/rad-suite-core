'use client';

// Layer 4 (Presentation): Case Release Confirmation Dialog
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { UserMinus, AlertCircle } from 'lucide-react';
import type { PacsStudyResult } from '@/types/pacs';

export interface CaseReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  study: PacsStudyResult | null;
  onConfirm: () => void;
}

export function CaseReleaseModal({
  isOpen,
  onClose,
  study,
  onConfirm,
}: CaseReleaseModalProps) {
  if (!isOpen || !study) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="p-0">
      <ModalHeader onClose={onClose} className="py-3 px-4">
        <div className="flex items-center gap-2">
          <UserMinus className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-sm text-on-surface">Release Case to Pool</span>
        </div>
      </ModalHeader>

      <ModalBody className="p-4 space-y-3">
        <p className="text-xs text-secondary leading-relaxed">
          Are you sure you want to release this study? It will return to the active hospital worklist pool so another radiologist can claim and report it.
        </p>

        {/* Case Detail Card */}
        <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/30 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface font-headline">{study.patientName || 'Unnamed Patient'}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {study.modality}
            </span>
          </div>
          <div className="text-[11px] font-mono text-secondary flex items-center gap-2">
            <span>Acc: <strong className="text-on-surface">{study.accessionNumber}</strong></span>
            {study.patientMrn && <span>• MRN: <strong className="text-on-surface">{study.patientMrn}</strong></span>}
          </div>
          {study.studyDescription && (
            <div className="text-[11px] text-secondary truncate">
              {study.studyDescription}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Local draft reports will remain safely preserved in local history.</span>
        </div>
      </ModalBody>

      <ModalFooter className="p-3 bg-surface-container-low border-t border-outline-variant/40 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onClose}
          className="text-xs h-8 px-3 cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={handleConfirm}
          className="text-xs h-8 px-3 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer font-semibold shadow-xs"
        >
          <UserMinus className="w-3.5 h-3.5" />
          <span>Confirm Release</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
