'use client';

// Layer 4 (Presentation): Task Itemized Breakdown & Proof Audit Modal (<200 lines)
import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { BackgroundTask, TaskItemDetail } from '@/services/background-tasks.types';
import { HmisScreenshotLightbox } from '@/components/hmis/hmis-screenshot-lightbox';
import { CheckCircle2, AlertTriangle, Square, Image as ImageIcon, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskDetailsModalProps {
  task: BackgroundTask | null;
  isOpen: boolean;
  onClose: () => void;
  onResume?: (id: string) => void;
}

export function TaskDetailsModal({ task, isOpen, onClose, onResume }: TaskDetailsModalProps) {
  const [activeProof, setActiveProof] = useState<TaskItemDetail | null>(null);

  if (!task) return null;

  const items = task.items || [];
  const succeededCount = items.filter((i) => i.status === 'success').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const stoppedCount = items.filter((i) => i.status === 'stopped').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" className="p-0">
        <ModalHeader onClose={onClose} className="py-3 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-sm text-on-surface truncate">{task.title}</span>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {succeededCount} Done
              </span>
              {failedCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  {failedCount} Failed
                </span>
              )}
              {stoppedCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {stoppedCount} Stopped
                </span>
              )}
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="p-3 sm:p-4 max-h-[65vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-8 text-secondary text-xs">
              No individual sub-item details recorded for this task.
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-[11px]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-xl bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-xs text-on-surface truncate">
                        {item.label}
                      </span>
                      {item.secondary && (
                        <span className="text-[10px] text-secondary truncate">
                          {item.secondary}
                        </span>
                      )}
                    </div>
                    {item.detail && (
                      <div className="text-[10px] text-secondary/80 mt-0.5 truncate">{item.detail}</div>
                    )}
                    {item.error && (
                      <div className="text-[10px] text-rose-400 mt-1 bg-rose-500/10 p-1 rounded border border-rose-500/20">
                        {item.error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'success' && (
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-[10px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                    {item.status === 'stopped' && (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                        <Square className="w-3 h-3 fill-current" /> Stopped
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="text-secondary/60 text-[10px]">Pending</span>
                    )}
                    {item.status === 'skipped' && (
                      <span className="text-amber-500/80 text-[10px]">Skipped</span>
                    )}

                    {item.auditScreenshot && (
                      <button
                        type="button"
                        onClick={() => setActiveProof(item)}
                        title="View Audit Screenshot"
                        className="px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Proof</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalBody>

        <ModalFooter className="py-2.5 px-4 flex items-center justify-between bg-surface-container-low border-t border-outline-variant/40">
          <span className="text-[11px] font-mono text-secondary">
            {items.length} items total • Started {new Date(task.startedAt).toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            {(task.status === 'stopped' || task.status === 'interrupted' || failedCount > 0) &&
              (stoppedCount > 0 || pendingCount > 0 || failedCount > 0) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onResume?.(task.id);
                    onClose();
                  }}
                  className="h-8 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Resume Remaining</span>
                </Button>
              )}
            <Button size="sm" variant="primary" onClick={onClose} className="h-8 text-xs font-semibold">
              Close
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Proof Lightbox */}
      {activeProof && (
        <HmisScreenshotLightbox
          filename={activeProof.auditScreenshot || null}
          patientName={activeProof.label}
          accession={activeProof.id}
          onClose={() => setActiveProof(null)}
        />
      )}
    </>
  );
}
