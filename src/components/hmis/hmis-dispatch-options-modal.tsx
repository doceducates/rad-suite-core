'use client';

// Layer 4 (Presentation): HMIS Dispatch Options Modal (Fast vs Dual-Verify)
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck, CloudUpload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HmisDispatchOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseCount: number;
  caseLabels?: string[];
  mode?: 'draft' | 'submit';
  companionStudies?: { accessionNumber: string; studyDescription?: string; modality?: string }[];
  onConfirm: (options: { deepVerify: boolean; dispatchCompanions?: boolean; action?: 'draft' | 'submit' }) => void;
}

export function HmisDispatchOptionsModal({
  isOpen,
  onClose,
  caseCount,
  caseLabels = [],
  mode = 'draft',
  companionStudies = [],
  onConfirm,
}: HmisDispatchOptionsModalProps) {
  const [deepVerify, setDeepVerify] = useState(false);
  const [dispatchCompanions, setDispatchCompanions] = useState(false);

  if (!isOpen) return null;

  const isSubmit = mode === 'submit';

  const handleStart = () => {
    onConfirm({ deepVerify, dispatchCompanions, action: mode });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="p-0">
      <ModalHeader onClose={onClose} className="py-3 px-4">
        <div className="flex items-center gap-2">
          {isSubmit ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <CloudUpload className="w-4 h-4 text-primary" />
          )}
          <span className="font-bold text-sm text-on-surface">
            {isSubmit ? 'HMIS Final Submission' : 'HMIS Draft Save'}
          </span>
          <span className={cn(
            "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border",
            isSubmit
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-primary/10 text-primary border-primary/20"
          )}>
            {caseCount} {caseCount === 1 ? 'case' : 'cases'}
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="p-4 space-y-3">
        {isSubmit && (
          <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
            <span className="font-bold block">Permanent Clinical Record</span>
            Submitting will finalize and permanently publish reports for all selected cases directly to Punjab HMIS.
          </div>
        )}

        {/* Compact Case Chip Preview */}
        {caseLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1.5 rounded-lg bg-surface-container/40 border border-outline-variant/30 text-[10px] font-mono text-secondary">
            {caseLabels.slice(0, 5).map((label, idx) => (
              <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">
                {label}
              </span>
            ))}
            {caseLabels.length > 5 && (
              <span className="px-1.5 py-0.5 text-secondary">+{caseLabels.length - 5} more</span>
            )}
          </div>
        )}

        {/* Mode Selector Pills */}
        <div className="space-y-2">
          {/* Fast Save Pill */}
          <button
            type="button"
            onClick={() => setDeepVerify(false)}
            className={cn(
              'w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
              !deepVerify
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-outline-variant/40 bg-surface-container/30 hover:bg-surface-container/60'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                !deepVerify ? 'bg-primary text-primary-foreground' : 'bg-surface-container text-secondary'
              )}>
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span>Fast Save</span>
                  <span className="text-[10px] font-mono text-primary font-medium">~15s/case</span>
                </div>
                <div className="text-[11px] text-secondary truncate">
                  Direct draft save with pre-save editor check
                </div>
              </div>
            </div>
            {!deepVerify && <Check className="w-4 h-4 text-primary shrink-0" />}
          </button>

          {/* Dual-Verification Pill */}
          <button
            type="button"
            onClick={() => setDeepVerify(true)}
            className={cn(
              'w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3',
              deepVerify
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-outline-variant/40 bg-surface-container/30 hover:bg-surface-container/60'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                deepVerify ? 'bg-primary text-primary-foreground' : 'bg-surface-container text-secondary'
              )}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span>Verify in HMIS</span>
                  <span className="text-[10px] font-mono text-amber-500 font-medium">~40s/case</span>
                </div>
                <div className="text-[11px] text-secondary truncate">
                  Dual-pass read-back check from HMIS editors
                </div>
              </div>
            </div>
            {deepVerify && <Check className="w-4 h-4 text-primary shrink-0" />}
          </button>
        </div>

        {/* Companion Studies Combined Dispatch Option */}
        {companionStudies.length > 0 && (
          <div className="p-2.5 rounded-xl border border-primary/25 bg-primary/5 space-y-1">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dispatchCompanions}
                onChange={(e) => setDispatchCompanions(e.target.checked)}
                className="mt-0.5 rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <div className="text-xs">
                <span className="font-semibold text-on-surface">
                  Also dispatch draft to {companionStudies.length > 1 ? 'companion studies' : 'companion study'}
                </span>
                <div className="text-[11px] text-secondary mt-0.5 font-mono">
                  {companionStudies.map((cs) => `${cs.studyDescription || 'Study'} (${cs.accessionNumber.slice(-5)})`).join(' · ')}
                </div>
              </div>
            </label>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="py-2.5 px-4 flex items-center justify-end gap-2 bg-surface-container-low border-t border-outline-variant/40">
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-xs cursor-pointer">
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleStart}
          className={cn(
            "h-8 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer",
            isSubmit ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
          )}
        >
          {isSubmit ? <ShieldCheck className="w-3.5 h-3.5" /> : <CloudUpload className="w-3.5 h-3.5" />}
          <span>{isSubmit ? 'Confirm & Submit to HMIS' : 'Start Draft Save'}</span>
        </Button>
      </ModalFooter>
    </Modal>
  );
}
