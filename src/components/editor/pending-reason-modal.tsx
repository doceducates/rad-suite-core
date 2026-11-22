'use client';

import { useState } from 'react';
import { X, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import { PendingReason } from '@/types';

interface PendingReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId?: string;
  studyId?: string;
  accessionNumber?: string;
  currentReason?: string | null;
  currentNotes?: string | null;
  onPendingSaved: (reason: string | null, notes: string | null) => void;
}

export const CLINICAL_REASONS: { id: PendingReason; label: string; desc: string }[] = [
  {
    id: 'awaiting_prior_images',
    label: 'Awaiting Prior Comparison Films',
    desc: 'Patient or hospital PACS has prior studies being retrieved for interval assessment.',
  },
  {
    id: 'missing_history_form',
    label: 'Missing Paper History Form / Record',
    desc: 'Paper clinical requisition or patient history form not yet collected from hospital.',
  },
  {
    id: 'technologist_ack_pending',
    label: 'Technologist Ack Pending / HMIS Issue',
    desc: 'Order not yet acknowledged by console technologist on Punjab HMIS portal.',
  },
  {
    id: 'pacs_transfer_pending',
    label: 'PACS Imaging Missing / Incomplete',
    desc: 'DICOM series transfer is incomplete or scan is missing from PACS servers.',
  },
  {
    id: 'awaiting_lab_creatinine',
    label: 'Awaiting Renal Profile / Creatinine',
    desc: 'Awaiting baseline laboratory chemistry before determining contrast protocol.',
  },
  {
    id: 'motion_artifact_repeat',
    label: 'Poor Image Quality / Motion Artifact',
    desc: 'Severe patient movement requires repeat acquisition or sequence re-take.',
  },
  {
    id: 'awaiting_clinical_history',
    label: 'Awaiting Referring Clinical Indication',
    desc: 'Requisition lacks clear diagnostic question; awaiting treating team clarification.',
  },
  {
    id: 'second_opinion_subspecialty',
    label: 'Subspecialty / MDT Review',
    desc: 'Case referred for multidisciplinary team conference or senior subspecialty review.',
  },
  {
    id: 'study_case',
    label: 'Study Case / Academic Interest',
    desc: 'Interesting teaching pathology, rare entity, or follow-up case held for consultant class review.',
  },
  {
    id: 'other',
    label: 'Other Clinical Reason',
    desc: 'Custom clinical or operational circumstance described in notes.',
  },
];

export function PendingReasonModal({
  isOpen,
  onClose,
  reportId,
  studyId,
  accessionNumber,
  currentReason,
  currentNotes,
  onPendingSaved,
}: PendingReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<PendingReason>(
    (currentReason as PendingReason) || 'awaiting_prior_images'
  );
  const [notes, setNotes] = useState(currentNotes || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          studyId,
          accessionNumber,
          pendingReason: selectedReason,
          pendingNotes: notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify.info('Case marked as pending / on hold');
        onPendingSaved(selectedReason, notes);
        onClose();
      } else {
        notify.error(data.error || 'Failed saving pending status');
      }
    } catch (err: any) {
      notify.error(err.message || 'Network error saving pending status');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          studyId,
          accessionNumber,
          pendingReason: null,
          pendingNotes: '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success('Pending hold status cleared');
        onPendingSaved(null, null);
        onClose();
      } else {
        notify.error(data.error || 'Failed clearing pending status');
      }
    } catch (err: any) {
      notify.error(err.message || 'Network error clearing pending status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Mark Case as Pending / On Hold
              </h3>
              <p className="text-[11px] text-zinc-500">Record clinical reason for delayed final verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          <label className="font-bold text-zinc-700 dark:text-zinc-300 block text-[11px]">
            Select Clinical Reason:
          </label>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {CLINICAL_REASONS.map((r) => (
              <label
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                  selectedReason === r.id
                    ? 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-zinc-100'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <input
                  type="radio"
                  name="pendingReason"
                  checked={selectedReason === r.id}
                  onChange={() => setSelectedReason(r.id)}
                  className="mt-0.5 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{r.label}</div>
                  <div className="text-[10px] text-zinc-400">{r.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-zinc-700 dark:text-zinc-300 block text-[11px]">
              Clinical Context / Follow-up Notes (Optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke with Ward 4 resident; prior MRI expected by 2 PM."
              rows={3}
              className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          {currentReason ? (
            <Button size="sm" variant="ghost" onClick={handleClear} isLoading={loading} className="gap-1 text-xs text-zinc-500 hover:text-zinc-900">
              <RotateCcw className="w-3.5 h-3.5" /> Clear Hold & Resume
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave} isLoading={loading} className="gap-1 font-semibold bg-amber-600 hover:bg-amber-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Save Pending Status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
