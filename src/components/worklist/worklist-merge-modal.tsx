'use client';

import React, { useState, useEffect } from 'react';
import { GitMerge, AlertTriangle, ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

interface MergeCandidate {
  accessionNumber: string;
  patientName: string;
  patientMrn: string;
  modality: string;
  studyDescription: string;
  scheduledAt: string;
  status: string;
  hmisStatus?: string | null;
  isManual?: boolean;
}

interface WorklistMergeModalProps {
  sourceStudy: PacsStudyResult | null;
  isOpen: boolean;
  onClose: () => void;
  onMergeSuccess?: (targetAccession: string) => void;
}

export function WorklistMergeModal({
  sourceStudy,
  isOpen,
  onClose,
  onMergeSuccess,
}: WorklistMergeModalProps) {
  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mrn = sourceStudy?.patientMrn || sourceStudy?.patientId || '';

  useEffect(() => {
    if (!isOpen || !mrn) {
      setCandidates([]);
      setSelectedTarget('');
      setError(null);
      return;
    }

    let active = true;
    setLoadingCandidates(true);
    setError(null);

    fetch(`/api/worklist/merge-manual?mrn=${encodeURIComponent(mrn)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && Array.isArray(data.candidates)) {
          const filtered = data.candidates.filter(
            (c: MergeCandidate) => c.accessionNumber.toLowerCase() !== sourceStudy?.accessionNumber.toLowerCase()
          );
          setCandidates(filtered);
          if (filtered.length > 0) {
            setSelectedTarget(filtered[0].accessionNumber);
          }
        } else {
          setError(data.error || 'No matching candidates found.');
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed loading merge candidates');
      })
      .finally(() => {
        if (active) setLoadingCandidates(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, mrn, sourceStudy?.accessionNumber]);

  if (!isOpen || !sourceStudy) return null;

  async function handleConfirmMerge() {
    if (!selectedTarget || !sourceStudy) return;
    setMerging(true);
    setError(null);

    try {
      const res = await fetch('/api/worklist/merge-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAccession: sourceStudy.accessionNumber,
          targetAccession: selectedTarget,
          notes: 'Merged via Worklist 1-click reconciliation dialog',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to merge case');
      }

      onMergeSuccess?.(selectedTarget);
      notify.success(`Case ${sourceStudy.accessionNumber} merged into ${selectedTarget}!`);
      onClose();
    } catch (err: any) {
      const errMsg = err.message || 'Merge failed';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                Reconcile & Merge Case
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                MRN: {mrn} • {sourceStudy.patientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Case Summary */}
          <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1.5">
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Source (Draft to transfer)</span>
              <span className="font-mono text-xs">{sourceStudy.accessionNumber}</span>
            </div>
            <div className="text-sm font-medium text-foreground">
              {sourceStudy.modality} — {sourceStudy.studyDescription}
            </div>
            <div className="text-xs text-muted-foreground">
              Findings and impressions from this entry will be transferred to the official study.
            </div>
          </div>

          <div className="flex justify-center -my-1 text-muted-foreground">
            <ArrowRight className="w-4 h-4 rotate-90" />
          </div>

          {/* Target Study Candidates */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Select Official Target Study:
            </label>

            {loadingCandidates ? (
              <div className="py-6 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Finding matching cases for this MRN...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                No matching studies found for MRN {mrn}. Ensure the HMIS case has been fetched.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {candidates.map((cand) => (
                  <label
                    key={cand.accessionNumber}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTarget === cand.accessionNumber
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetStudy"
                      checked={selectedTarget === cand.accessionNumber}
                      onChange={() => setSelectedTarget(cand.accessionNumber)}
                      className="mt-1 text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-foreground">
                          {cand.accessionNumber}
                        </span>
                        {cand.hmisStatus && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-mono">
                            {cand.hmisStatus}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {cand.modality} • {cand.studyDescription}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={merging}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmMerge}
            disabled={merging || !selectedTarget || candidates.length === 0}
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {merging ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Merging...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Merge</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
