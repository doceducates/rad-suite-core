'use client';

// Layer 4 (Presentation): Clinical Status Conflict Resolution Dialog (<130 lines)
import React from 'react';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import type { PacsStudyResult } from '@/types/pacs';
import { WORKFLOW_STATUS_CONFIG } from './worklist-status-action-menu';

interface WorklistStatusConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  study: PacsStudyResult;
  targetStatus: string;
  onConfirm: () => void;
}

export function WorklistStatusConflictModal({
  isOpen,
  onClose,
  study,
  targetStatus,
  onConfirm,
}: WorklistStatusConflictModalProps) {
  const isHmisPublished = study.hmisStatus === 'published';
  const targetConfig = WORKFLOW_STATUS_CONFIG.find((c) => c.id === targetStatus);
  const targetLabel = targetConfig ? `${targetConfig.icon} ${targetConfig.label}` : targetStatus;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <ModalTitle>
            {isHmisPublished
              ? 'Status Conflict: Case is Published on HMIS'
              : 'Status Notice: Case Not Published on HMIS'}
          </ModalTitle>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-3.5">
        {/* Patient & Case Summary Banner */}
        <div className="p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-on-surface">
              {study.patientName || 'Patient'}{' '}
              <span className="font-normal text-secondary">
                ({study.age ? `${study.age}y` : ''} · {study.gender || 'Unknown'})
              </span>
            </div>
            <div className="text-[11px] font-mono text-secondary mt-0.5">
              ACC: <span className="text-on-surface font-semibold">{study.accessionNumber}</span>
              {study.patientMrn && ` · MRN: ${study.patientMrn}`}
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            {study.modality || 'Study'}
          </span>
        </div>

        {/* Status Transition Visualizer */}
        <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container-high/40 flex items-center justify-around gap-2 text-xs">
          <div className="text-center">
            <span className="text-[10px] text-secondary font-medium block mb-1">HMIS Portal Truth</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3" />
              {study.hmisStatus ? study.hmisStatus.toUpperCase() : 'PUBLISHED'}
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-secondary/60 shrink-0" />

          <div className="text-center">
            <span className="text-[10px] text-secondary font-medium block mb-1">Local Workstation Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              {targetLabel}
            </span>
          </div>
        </div>

        {/* Clinical Safety Explanation */}
        <div className="space-y-1.5 text-[11.5px] leading-relaxed text-secondary">
          {isHmisPublished ? (
            <>
              <p>
                This examination is officially verified and signed on the hospital portal.
              </p>
              <p className="text-on-surface font-medium">
                Setting your local workstation status to <span className="text-primary font-bold">{targetLabel}</span> keeps the case in your internal review queue (e.g. for revision, addendum drafting, or holding).
              </p>
              <p className="text-[10.5px] text-secondary/80 flex items-center gap-1">
                <span>🔒</span>
                <span>This action will <strong>NOT</strong> unpublish or alter the official report on the live HMIS portal.</span>
              </p>
            </>
          ) : (
            <p>
              Marking this study as <strong>Published</strong> sets your local workstation state to finalized. It does not automatically transmit or sign the report on the remote HMIS portal.
            </p>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          {isHmisPublished ? 'Keep HMIS (Published)' : 'Cancel'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {isHmisPublished ? `Set Local Status to ${targetLabel}` : 'Confirm Local Status'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
