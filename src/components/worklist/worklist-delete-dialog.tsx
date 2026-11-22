'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistDeleteDialogProps {
  study: PacsStudyResult | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (accession: string) => Promise<void>;
}

export function WorklistDeleteDialog({
  study,
  isOpen,
  onClose,
  onConfirmDelete,
}: WorklistDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !study) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirmDelete(study.accessionNumber);
      notify.success(`Study ${study.accessionNumber} removed from local index`);
      onClose();
    } catch (err: any) {
      notify.error(err.message || 'Failed deleting study from index');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <ModalTitle>Delete from Workstation Index</ModalTitle>
          <ModalDescription>Clean up worklist backlog and remove clutter</ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/40 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-secondary font-sans">Patient:</span>
            <span className="font-bold text-on-surface font-sans">{study.patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary font-sans">MRN:</span>
            <span className="text-on-surface">{study.patientId || study.patientMrn || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary font-sans">Accession:</span>
            <span className="font-bold text-primary">{study.accessionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary font-sans">Exam:</span>
            <span className="text-on-surface font-sans truncate max-w-[200px]" title={study.studyDescription}>
              {study.studyDescription}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Workstation Index Only</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            This action permanently deletes this record and local drafts from your local Rad Suite workstation index.
            Remote hospital HMIS portal records and hospital PACS servers will <strong>not</strong> be modified.
          </p>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={deleting}
          className="cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="cursor-pointer gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{deleting ? 'Deleting...' : 'Delete from Index'}</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
