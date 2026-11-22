'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Edit3, ArrowRight, X } from 'lucide-react';

export interface BatchHmisItemResult {
  accession: string;
  patientName: string;
  mrn?: string;
  status: 'pending' | 'saving' | 'success' | 'failed';
  error?: string;
}

interface BatchHmisItemRowProps {
  item: BatchHmisItemResult;
  onRetry: (accession: string) => void;
  onUpdateAccession: (oldAcc: string, newAcc: string) => Promise<void>;
  isBatchRunning: boolean;
}

export function BatchHmisItemRow({
  item,
  onRetry,
  onUpdateAccession,
  isBatchRunning,
}: BatchHmisItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newAcc, setNewAcc] = useState(item.accession);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [shifting, setShifting] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);

  // Fetch candidates when expanding inline edit
  useEffect(() => {
    if (isEditing && item.mrn) {
      setLoadingCandidates(true);
      fetch(`/api/worklist/merge-manual?mrn=${encodeURIComponent(item.mrn)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.candidates)) {
            setCandidates(data.candidates.filter((c: any) => c.accessionNumber !== item.accession));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCandidates(false));
    }
  }, [isEditing, item.mrn, item.accession]);

  const handleSaveShift = async () => {
    const target = newAcc.trim();
    if (!target || target === item.accession) return;
    setShifting(true);
    setShiftError(null);
    try {
      await onUpdateAccession(item.accession, target);
      setIsEditing(false);
    } catch (err: any) {
      setShiftError(err.message || 'Failed shifting accession');
    } finally {
      setShifting(false);
    }
  };

  return (
    <div className="rounded-lg bg-surface-container/50 border border-outline-variant/30 text-[11px] p-2 space-y-2">
      <div className="flex items-center justify-between font-mono">
        <div className="min-w-0 pr-2">
          <div className="font-bold text-on-surface truncate">{item.patientName}</div>
          <div className="text-[10px] text-secondary">
            ACC: <strong className="text-on-surface">{item.accession}</strong> {item.mrn && `• MRN: ${item.mrn}`}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {item.status === 'saving' && (
            <span className="flex items-center gap-1 text-primary text-[10px]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          )}
          {item.status === 'success' && (
            <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Draft Saved
            </span>
          )}
          {item.status === 'failed' && (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-rose-500 text-[10px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Failed
              </span>
              {!isBatchRunning && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-1.5 text-[10px] gap-1 cursor-pointer"
                    onClick={() => onRetry(item.accession)}
                    title="Retry sending this case"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px] gap-1 cursor-pointer text-secondary hover:text-on-surface"
                    onClick={() => { setIsEditing(!isEditing); setShiftError(null); }}
                    title="Change accession or merge case"
                  >
                    <Edit3 className="w-2.5 h-2.5" /> Fix Acc
                  </Button>
                </>
              )}
            </div>
          )}
          {item.status === 'pending' && (
            <span className="text-secondary/60 text-[10px]">Pending</span>
          )}
        </div>
      </div>

      {/* Failure Diagnostic Banner */}
      {item.status === 'failed' && item.error && !isEditing && (
        <div className="p-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-500 font-sans flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="break-all">{item.error}</span>
        </div>
      )}

      {/* Inline Accession Correction Form */}
      {isEditing && (
        <div className="p-2.5 rounded-lg bg-surface border border-primary/30 space-y-2 font-sans animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface">Update Accession & Shift Report:</span>
            <button onClick={() => setIsEditing(false)} className="text-secondary hover:text-on-surface cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newAcc}
              onChange={(e) => setNewAcc(e.target.value)}
              placeholder="Correct accession number..."
              className="flex-1 h-7 px-2 text-xs font-mono rounded bg-surface-container border border-outline-variant/60 text-on-surface focus:outline-none focus:border-primary"
            />
            <Button
              size="sm"
              variant="primary"
              disabled={shifting || !newAcc.trim() || newAcc.trim() === item.accession}
              onClick={handleSaveShift}
              className="h-7 px-2 text-[10px] gap-1 cursor-pointer"
            >
              {shifting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
              <span>Shift & Prepare</span>
            </Button>
          </div>

          {/* Candidate accession suggestions */}
          {loadingCandidates && (
            <div className="text-[10px] text-secondary flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Finding registered orders for MRN...
            </div>
          )}

          {!loadingCandidates && candidates.length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] text-secondary font-medium">Matching HMIS Studies on file:</span>
              <div className="flex flex-wrap gap-1">
                {candidates.map((cand) => (
                  <button
                    key={cand.accessionNumber}
                    type="button"
                    onClick={() => setNewAcc(cand.accessionNumber)}
                    className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono hover:bg-primary/20 cursor-pointer"
                  >
                    {cand.accessionNumber} ({cand.studyDescription || cand.modality})
                  </button>
                ))}
              </div>
            </div>
          )}

          {shiftError && (
            <div className="text-[10px] text-rose-500 font-medium">{shiftError}</div>
          )}
        </div>
      )}
    </div>
  );
}
