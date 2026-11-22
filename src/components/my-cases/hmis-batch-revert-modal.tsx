'use client';

// Layer 4 (Presentation): HMIS Batch Revert Confirmation Modal
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { PacsStudyResult } from '@/types/pacs';

export interface HmisBatchRevertModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCases: PacsStudyResult[];
  onConfirm: () => void;
}

export function HmisBatchRevertModal({
  isOpen,
  onClose,
  selectedCases,
  onConfirm,
}: HmisBatchRevertModalProps) {
  if (!isOpen) return null;

  const count = selectedCases.length;

  const handleStartRevert = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="p-0">
      <ModalHeader onClose={onClose} className="py-3 px-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-sm text-on-surface">Revert to Default State</span>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {count} {count === 1 ? 'case' : 'cases'}
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="p-4 space-y-3">
        <p className="text-xs text-secondary leading-relaxed">
          Reset <strong className="text-on-surface font-semibold">{count} case(s)</strong> back to the pristine, empty default template on the Punjab HMIS portal.
        </p>

        {/* Selected Cases Preview Chips */}
        {selectedCases.length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 rounded-lg bg-surface-container/40 border border-outline-variant/30 text-[10px] font-mono text-secondary">
            {selectedCases.slice(0, 6).map((c) => (
              <span key={c.accessionNumber} className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">
                {c.patientName} ({c.accessionNumber})
              </span>
            ))}
            {selectedCases.length > 6 && (
              <span className="px-1.5 py-0.5 text-secondary font-sans">
                +{selectedCases.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Informational Callout */}
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Online HMIS draft text will be cleared</p>
            <p className="text-[10px] text-secondary leading-normal">
              The gateway will open each study on the Punjab HMIS portal, select the blank module, and save it. Rad Suite local draft reports remain safely archived in local history.
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="py-2.5 px-4 bg-surface-container/30 border-t border-outline-variant/30 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs h-8 px-3">
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleStartRevert}
          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8 px-3 cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Revert {count} {count === 1 ? 'Case' : 'Cases'}</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
