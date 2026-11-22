'use client';

// Layer 4 (Presentation): HMIS Claim & Add Result Confirmation Modal (<100 lines)
import React from 'react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { CheckSquare, ArrowRight, UserPlus, FileEdit } from 'lucide-react';
import type { PacsStudyResult } from '@/types/pacs';

interface HmisClaimPromptModalProps {
  isOpen: boolean;
  study: PacsStudyResult | null;
  claiming: boolean;
  onClose: () => void;
  onConfirmClaimAndReport: () => Promise<void>;
}

export function HmisClaimPromptModal({
  isOpen,
  study,
  claiming,
  onClose,
  onConfirmClaimAndReport,
}: HmisClaimPromptModalProps) {
  if (!study) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <ModalTitle>Claim to My Cases</ModalTitle>
            <p className="text-[11px] text-secondary">Assign patient before adding report findings</p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-3 py-2">
        <div className="p-3 rounded-lg border border-outline-variant/60 bg-surface-container-low/70 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface text-sm">{study.patientName}</span>
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px] font-mono">
              {study.modality}
            </span>
          </div>
          <div className="text-secondary text-[11px] font-mono flex items-center gap-2">
            <span>MRN: <strong className="text-on-surface">{study.patientMrn}</strong></span>
            <span>•</span>
            <span>ACC: <strong className="text-on-surface">{study.accessionNumber}</strong></span>
          </div>
          <p className="text-on-surface-variant font-medium text-[11px] pt-1">
            {study.studyDescription || 'Diagnostic Examination'}
          </p>
        </div>

        <p className="text-xs text-secondary leading-relaxed">
          To draft or edit results, this study must be added to your personal reporting queue in <strong>My Cases</strong>.
        </p>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose} disabled={claiming}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirmClaimAndReport}
          disabled={claiming}
          className="gap-1.5 font-bold"
        >
          {claiming ? (
            <span>Claiming...</span>
          ) : (
            <>
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Claim & Add Result</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70" />
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
