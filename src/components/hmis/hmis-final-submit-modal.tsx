'use client';

// Layer 4 (Presentation): Double-Confirmation Guard for HMIS Final Submission
// Strict File Size Invariant: Target < 150 lines, max 250 lines

import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Send, Loader2, ShieldAlert } from 'lucide-react';

export interface HmisFinalSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName?: string;
  patientMrn?: string;
  accessionNumber?: string;
  studyDescription?: string;
  onConfirm: (options?: { deepVerify?: boolean }) => Promise<void> | void;
  submitting?: boolean;
}

export function HmisFinalSubmitModal({
  isOpen,
  onClose,
  patientName = 'Patient',
  patientMrn,
  accessionNumber,
  studyDescription,
  onConfirm,
  submitting = false,
}: HmisFinalSubmitModalProps) {
  const [deepVerify, setDeepVerify] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm({ deepVerify });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" className="p-0">
      <ModalHeader onClose={onClose} className="py-3 px-5 border-b border-rose-500/20 bg-rose-500/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Confirm Final HMIS Submission</h3>
            <p className="text-[11px] text-muted-foreground">Permanent clinical record publication</p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="p-5 space-y-4">
        {/* Patient Summary Card */}
        <div className="p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-foreground">{patientName}</span>
            {accessionNumber && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-muted-foreground">
                ACC: {accessionNumber}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
            {patientMrn && <span>MRN: {patientMrn}</span>}
            {studyDescription && <span>&bull; {studyDescription}</span>}
          </div>
        </div>

        {/* Warning Alert Box */}
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Permanent Submission Warning</span>
          </div>
          <p className="text-[11px] leading-relaxed text-rose-900/90 dark:text-rose-200/90">
            Submitting this report immediately signs and publishes it to the official Punjab HMIS Portal (<code>hmis.punjab.gov.pk</code>). 
            Once finalized, this study is sealed in the hospital database and cannot be reverted to a draft.
          </p>
        </div>

        {/* Dual-Verification Readback Check Option */}
        <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-container/40 cursor-pointer select-none text-xs">
          <input
            type="checkbox"
            checked={deepVerify}
            onChange={(e) => setDeepVerify(e.target.checked)}
            className="rounded border-outline-variant text-rose-600 focus:ring-rose-500 h-4 w-4"
          />
          <span className="text-foreground font-medium">
            Perform post-submit dual-verification readback check
          </span>
        </label>
      </ModalBody>

      <ModalFooter className="py-3 px-5 flex items-center justify-end gap-2 bg-surface-container-low border-t border-outline-variant/40">
        <Button
          size="sm"
          variant="ghost"
          disabled={submitting}
          onClick={onClose}
          className="text-xs h-8"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={submitting}
          onClick={handleConfirm}
          className="text-xs h-8 font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Submitting to HMIS...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Confirm & Submit to HMIS</span>
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
