'use client';

// Layer 4 (Presentation): Responsive HMIS Batch Results Modal & Proof Viewer
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  hmisBackgroundQueue,
  HmisBatchItemRecord,
} from '@/services/hmis/hmis-background-queue.service';
import { HmisScreenshotLightbox } from './hmis-screenshot-lightbox';
import { CheckCircle2, AlertTriangle, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HmisBatchResultsHost() {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<HmisBatchItemRecord[]>([]);

  useEffect(() => {
    const syncState = () => {
      setIsOpen(hmisBackgroundQueue.isResultsModalVisible());
      setResults(hmisBackgroundQueue.getResults());
    };
    syncState();
    return hmisBackgroundQueue.subscribe(syncState);
  }, []);

  if (!isOpen || results.length === 0) return null;

  return (
    <HmisBatchResultsModal
      isOpen={isOpen}
      onClose={() => hmisBackgroundQueue.closeResultsModal(true)}
      results={results}
    />
  );
}

interface HmisBatchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: HmisBatchItemRecord[];
}

export function HmisBatchResultsModal({
  isOpen,
  onClose,
  results,
}: HmisBatchResultsModalProps) {
  const [activeProof, setActiveProof] = useState<HmisBatchItemRecord | null>(null);

  const succeededCount = results.filter((r) => r.status === 'success').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" className="p-0">
        <ModalHeader onClose={onClose} className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-on-surface">HMIS Draft Results</span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {succeededCount} Saved
              </span>
              {failedCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  {failedCount} Failed
                </span>
              )}
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-3 sm:p-4 max-h-[70vh] overflow-y-auto">
          {/* Mobile Card View (< 640px) */}
          <div className="space-y-2 sm:hidden">
            {results.map((r) => (
              <div
                key={r.accessionNumber}
                className="p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-on-surface truncate">{r.patientName}</span>
                  {r.status === 'success' ? (
                    <span className="flex items-center gap-1 text-emerald-500 font-bold text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-500 font-bold text-[10px]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-secondary">
                  <span>{r.accessionNumber} • {r.scanType}</span>
                  <span>{r.elapsedSeconds || ''}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-[10px]">
                  <span className={cn(
                    'font-medium',
                    r.verified ? 'text-primary' : 'text-secondary'
                  )}>
                    {r.verified ? 'Dual-Verified' : 'Fast Saved'}
                  </span>
                  {r.auditScreenshot && (
                    <button
                      type="button"
                      onClick={() => setActiveProof(r)}
                      className="px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Proof</span>
                    </button>
                  )}
                </div>
                {r.error && (
                  <div className="text-[10px] text-rose-500 bg-rose-500/10 p-1.5 rounded">
                    {r.error}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-outline-variant/30">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
              <thead className="bg-surface-container/80 text-secondary border-b border-outline-variant/40">
                <tr>
                  <th className="py-2 px-3">Patient</th>
                  <th className="py-2 px-3">Accession / MRN</th>
                  <th className="py-2 px-3">Procedure</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Verify</th>
                  <th className="py-2 px-3 text-right">Time</th>
                  <th className="py-2 px-3 text-center">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
                {results.map((r) => (
                  <tr key={r.accessionNumber} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-2 px-3 font-sans font-bold text-on-surface truncate max-w-[130px]">
                      {r.patientName}
                    </td>
                    <td className="py-2 px-3 text-secondary text-[10px]">
                      <div>{r.accessionNumber}</div>
                      {r.patientMrn && <div className="text-[9px] text-secondary/70">MRN: {r.patientMrn}</div>}
                    </td>
                    <td className="py-2 px-3 text-secondary truncate max-w-[140px]">
                      {r.scanType}
                    </td>
                    <td className="py-2 px-3">
                      {r.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                          <Check className="w-3 h-3" /> Saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-bold" title={r.error}>
                          <AlertTriangle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                        r.verified
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-surface-container text-secondary'
                      )}>
                        {r.verified ? 'Dual' : 'Fast'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-secondary">
                      {r.elapsedSeconds || '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {r.auditScreenshot ? (
                        <button
                          type="button"
                          onClick={() => setActiveProof(r)}
                          className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="View HMIS Audit Screenshot"
                        >
                          <ImageIcon className="w-3.5 h-3.5 inline" />
                        </button>
                      ) : (
                        <span className="text-secondary/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalBody>

        <ModalFooter className="py-2.5 px-4 flex items-center justify-between bg-surface-container-low border-t border-outline-variant/40">
          <span className="text-[10px] font-mono text-secondary">
            {results.length} total • Proofs auto-purged on close
          </span>
          <Button size="sm" variant="primary" onClick={onClose} className="h-8 text-xs font-semibold">
            Done
          </Button>
        </ModalFooter>
      </Modal>

      {/* Screenshot Lightbox */}
      {activeProof && (
        <HmisScreenshotLightbox
          filename={activeProof.auditScreenshot || null}
          patientName={activeProof.patientName}
          accession={activeProof.accessionNumber}
          onClose={() => setActiveProof(null)}
        />
      )}
    </>
  );
}
