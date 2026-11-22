'use client';

// Layer 4 (Presentation): 1-Click Quick HMIS Draft Dispatch Button
// Strict File Size Invariant: Target < 250 lines

import React, { useState } from 'react';
import { CloudUpload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { enqueueHmisDrafts } from '@/services/hmis/hmis-background-queue.service';
import type { PacsStudyResult } from '@/types/pacs';

interface WorklistQuickHmisButtonProps {
  study: PacsStudyResult;
  onSuccess?: () => void;
  currentUserName?: string;
}

export function WorklistQuickHmisButton({
  study,
  onSuccess,
  currentUserName,
}: WorklistQuickHmisButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleQuickDraft = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row navigation to workstation
    if (loading) return;

    setLoading(true);
    setStatus('idle');

    enqueueHmisDrafts(
      [
        {
          studyId: study.studyId,
          accessionNumber: study.accessionNumber,
          patientMrn: study.patientMrn,
          patientName: study.patientName,
          patientId: study.patientId,
          scanType: study.scanType,
          modality: study.modality,
          bodyPart: study.bodyPart,
          studyDescription: study.studyDescription,
          clinicalHistory: study.clinicalHistory,
          hmisCpt: study.hmisCpt,
          hmisInvestigationId: study.hmisInvestigationId,
        },
      ],
      {
        doctorName: currentUserName,
        onComplete: (summary) => {
          setLoading(false);
          if (summary.succeeded > 0) {
            setStatus('success');
            onSuccess?.();
            setTimeout(() => setStatus('idle'), 4000);
          } else {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 4000);
          }
        },
      }
    );
  };

  return (
    <button
      type="button"
      onClick={handleQuickDraft}
      disabled={loading}
      title={
        status === 'success'
          ? 'Draft successfully saved to Punjab HMIS Portal!'
          : status === 'error'
          ? 'HMIS Draft Dispatch Failed / Skipped'
          : `Quick Save Draft to HMIS (${study.accessionNumber})`
      }
      className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
        status === 'success'
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : status === 'error'
          ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
          : 'border-outline-variant/60 text-secondary hover:text-primary hover:bg-surface-container'
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="hidden xl:inline text-[10px]">Saving...</span>
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden xl:inline text-[10px] text-emerald-500">HMIS OK</span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span className="hidden xl:inline text-[10px] text-rose-500">Failed</span>
        </>
      ) : (
        <>
          <CloudUpload className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden xl:inline text-[10px]">HMIS</span>
        </>
      )}
    </button>
  );
}
