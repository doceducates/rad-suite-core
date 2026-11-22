'use client';

// Layer 4 (Presentation): HMIS Final Submission Pre-Flight Confirmation Dialog (<170 lines)
import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  Send,
  AlertTriangle,
  ShieldCheck,
  User,
  Stethoscope,
  FileText,
  Loader2,
} from 'lucide-react';
import { htmlToClinicalText, stripAttributionFromText } from '@/lib/clinical-format';

export interface HmisSubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientMrn?: string;
  accessionNumber?: string;
  modality?: string;
  studyDescription?: string;
  pgrName?: string;
  consultantName?: string;
  impression?: string;
}

export function HmisSubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  patientName,
  patientAge,
  patientGender,
  patientMrn,
  accessionNumber,
  modality = 'MR',
  studyDescription,
  pgrName,
  consultantName,
  impression = '',
}: HmisSubmitConfirmModalProps) {
  const cleanImpression = stripAttributionFromText(htmlToClinicalText(impression)).trim();

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose} size="md">
      <ModalHeader onClose={isSubmitting ? undefined : onClose}>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <ModalTitle>Confirm Final HMIS Submission</ModalTitle>
            <span className="text-[10px] font-mono font-semibold text-secondary block">
              Official Punjab Hospital Portal · hmis.punjab.gov.pk
            </span>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-3.5">
        {/* 1. Patient & Case Summary */}
        <div className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container/60 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface text-sm flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary shrink-0" />
              {patientName || 'Unknown Patient'}
              <span className="font-normal text-secondary text-xs">
                ({patientAge ? `${patientAge}y` : ''} · {patientGender || 'Unknown'})
              </span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {modality}
            </span>
          </div>
          <div className="text-[11px] font-mono text-secondary flex items-center gap-2 pt-0.5">
            <span>ACC: <strong className="text-on-surface font-semibold">{accessionNumber || 'N/A'}</strong></span>
            <span>·</span>
            <span>MRN: <strong className="text-on-surface font-semibold">{patientMrn || 'N/A'}</strong></span>
          </div>
          <div className="text-[11px] text-secondary font-medium pt-0.5 truncate">
            {studyDescription || `${modality} Examination`}
          </div>
        </div>

        {/* 2. Clinician Attribution */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-high/40">
            <span className="text-[10px] font-medium text-secondary block flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-primary" /> Reporting Resident (PGR)
            </span>
            <span className="font-semibold text-on-surface text-[11px] truncate block mt-0.5">
              {pgrName || 'Current Clinician'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border border-outline-variant/50 bg-surface-container-high/40">
            <span className="text-[10px] font-medium text-secondary block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Consultant Radiologist
            </span>
            <span className="font-semibold text-on-surface text-[11px] truncate block mt-0.5">
              {consultantName || 'Supervising Consultant'}
            </span>
          </div>
        </div>

        {/* 3. Report Impression Preview */}
        <div>
          <span className="text-[11px] font-semibold text-secondary flex items-center gap-1 mb-1">
            <FileText className="w-3.5 h-3.5 text-primary" />
            Impression Preview
          </span>
          <div className="p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low max-h-28 overflow-y-auto text-xs text-on-surface font-sans leading-relaxed whitespace-pre-wrap select-text">
            {cleanImpression || (
              <span className="text-secondary italic">No impression recorded.</span>
            )}
          </div>
        </div>

        {/* 4. Official HMIS Publication Warning Callout */}
        <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <p className="font-bold">Permanent Clinical Record</p>
            <p>
              Submitting will finalize and permanently publish this radiology report to Punjab HMIS.
              The investigation status will be updated to <strong>Submitted / Published</strong>.
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          onClick={onClose}
          className="text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSubmitting || !cleanImpression}
          onClick={onConfirm}
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isSubmitting ? (
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
