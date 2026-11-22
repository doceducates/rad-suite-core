'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CloudUpload, X, RefreshCw } from 'lucide-react';
import type { PacsStudyResult } from '@/types/pacs';
import { BatchHmisItemRow, type BatchHmisItemResult } from './batch-hmis-item-row';
import { isUuid, sanitizeMrn } from '@/lib/mrn-security';

interface MyCasesBatchHmisModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCases: PacsStudyResult[];
  onComplete?: () => void;
  currentUserName?: string;
}

export function MyCasesBatchHmisModal({
  isOpen,
  onClose,
  selectedCases,
  onComplete,
  currentUserName,
}: MyCasesBatchHmisModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<BatchHmisItemResult[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setResults(
        selectedCases.map((c) => ({
          accession: c.accessionNumber,
          patientName: c.patientName,
          mrn: sanitizeMrn(c.patientMrn) || (!isUuid(c.patientId) ? c.patientId : ''),
          status: 'pending',
        }))
      );
      setCurrentIndex(0);
      setIsRunning(false);
      setFinished(false);
    }
  }, [isOpen, selectedCases]);

  if (!isOpen) return null;

  const saveSingleDraft = async (accession: string, mrn?: string, patientName?: string) => {
    // 1. Fetch current report findings
    const repRes = await fetch(`/api/reports?accession=${encodeURIComponent(accession)}`);
    let reportData: any = null;
    let studyData: any = null;
    let patientData: any = null;
    if (repRes.ok) {
      const json = await repRes.json();
      reportData = json.report;
      studyData = json.study;
      patientData = json.patient;
    }

    if (!reportData?.findings || reportData.findings.trim().length === 0) {
      throw new Error('No report findings entered yet for this case');
    }

    const resolvedMrn = sanitizeMrn(mrn) || sanitizeMrn(patientData?.mrNumber) || sanitizeMrn(patientData?.mrn) || sanitizeMrn(studyData?.patientMrn) || '';
    const draftPayload = {
      patientMrn: resolvedMrn,
      patientName: patientName || patientData?.fullName || studyData?.patientName || '',
      accessionNumber: accession,
      scanType: studyData?.scanType || 'Diagnostic Scan',
      modality: studyData?.modality || 'MRI',
      bodyPart: studyData?.bodyPart,
      cpt: studyData?.hmisCpt,
      investigationId: studyData?.hmisInvestigationId,
      technique: reportData.technique || 'Examination performed.',
      findings: reportData.findings,
      impression: reportData.impression || '',
      clinicalHistory: (reportData.clinicalHistory && reportData.clinicalHistory.replace(/<[^>]*>/g, '').trim().length > 0)
        ? reportData.clinicalHistory
        : (studyData?.clinicalHistory || ''),
      pgrName: currentUserName || '',
      consultantName: '',
    };

    const draftRes = await fetch('/api/hmis/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draftPayload),
    });

    const draftJson = await draftRes.json();
    if (!draftRes.ok || !draftJson.success) {
      throw new Error(draftJson.error || 'HMIS draft save rejected');
    }
  };

  const startBatchDraftSave = async (itemsToProcess?: BatchHmisItemResult[]) => {
    const queue = itemsToProcess || results;
    setIsRunning(true);
    setFinished(false);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setCurrentIndex(i);

      setResults((prev) =>
        prev.map((r) => (r.accession === item.accession ? { ...r, status: 'saving' } : r))
      );

      try {
        await saveSingleDraft(item.accession, item.mrn, item.patientName);
        setResults((prev) =>
          prev.map((r) => (r.accession === item.accession ? { ...r, status: 'success', error: undefined } : r))
        );
      } catch (err: any) {
        setResults((prev) =>
          prev.map((r) => (r.accession === item.accession ? { ...r, status: 'failed', error: err.message } : r))
        );
      }

      if (i < queue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setIsRunning(false);
    setFinished(true);
    onComplete?.();
  };

  const handleRetrySingle = async (accession: string) => {
    const target = results.find((r) => r.accession === accession);
    if (!target) return;

    setResults((prev) =>
      prev.map((r) => (r.accession === accession ? { ...r, status: 'saving', error: undefined } : r))
    );

    try {
      await saveSingleDraft(target.accession, target.mrn, target.patientName);
      setResults((prev) =>
        prev.map((r) => (r.accession === accession ? { ...r, status: 'success', error: undefined } : r))
      );
    } catch (err: any) {
      setResults((prev) =>
        prev.map((r) => (r.accession === accession ? { ...r, status: 'failed', error: err.message } : r))
      );
    }
    onComplete?.();
  };

  const handleUpdateAccession = async (oldAcc: string, newAcc: string) => {
    // Call merge API to shift findings and re-key accession
    const res = await fetch('/api/worklist/merge-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceAccession: oldAcc, targetAccession: newAcc }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed shifting report to new accession');
    }

    // Update item in results state to point to new accession and reset status to pending
    setResults((prev) =>
      prev.map((r) =>
        r.accession === oldAcc
          ? { ...r, accession: newAcc, status: 'pending', error: undefined }
          : r
      )
    );
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const failedItems = results.filter((r) => r.status === 'failed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-surface border border-outline-variant/60 rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-primary" />
            <h3 className="font-headline font-bold text-sm text-on-surface">
              Batch Save Drafts to HMIS Portal
            </h3>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-xs text-secondary leading-relaxed">
          Saves drafts for <strong>{selectedCases.length} selected cases</strong> directly into the Punjab HMIS Portal. 
          Each case is secured in the durable local vault first.
        </p>

        {isRunning && (
          <div className="space-y-1.5 py-1">
            <div className="flex justify-between text-[11px] font-mono text-secondary">
              <span>Saving case {currentIndex + 1} of {results.length}...</span>
              <span>{Math.round(((currentIndex + 1) / results.length) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / results.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-2 border border-outline-variant/40 rounded-xl p-2 bg-surface-container-lowest text-xs">
          {results.map((r) => (
            <BatchHmisItemRow
              key={r.accession}
              item={r}
              onRetry={handleRetrySingle}
              onUpdateAccession={handleUpdateAccession}
              isBatchRunning={isRunning}
            />
          ))}
        </div>

        {finished && (
          <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/60 flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="text-on-surface font-medium">
              Completed: <strong className="text-emerald-500">{successCount} saved</strong>
              {failedItems.length > 0 && <span className="text-rose-500 ml-1.5 font-bold">({failedItems.length} failed)</span>}
            </span>
            <div className="flex items-center gap-2">
              {failedItems.length > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => startBatchDraftSave(failedItems)}
                  className="h-7 text-xs gap-1 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Failed ({failedItems.length})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onClose} className="h-7 text-xs cursor-pointer">
                Done
              </Button>
            </div>
          </div>
        )}

        {!isRunning && !finished && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
            <Button size="sm" variant="ghost" onClick={onClose} className="cursor-pointer text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => startBatchDraftSave()}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>Start Batch Draft Save ({selectedCases.length})</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
