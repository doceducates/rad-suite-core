'use client';

// Layer 4 (Presentation): Safe Sidebar-to-Report Sync Preview Modal
// Invariant: Target < 250 lines, max 350 lines.

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, GitCompare, ArrowRight, X, CheckSquare, Square } from 'lucide-react';
import { diffWords, diffByLevels, computeDiffStats } from '@/lib/clinical-diff-engine';
import { compileDiscussionToReportHtml, DiscussionFinding } from '@/lib/discussion-compiler';

interface SidebarSyncPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  findings: DiscussionFinding[];
  consultantNotes: string;
  pgrName?: string;
  currentFindings: string;
  currentImpression: string;
  onConfirmSync: (syncedFindingsHtml: string, syncedImpressionHtml: string) => Promise<void>;
  isSyncing: boolean;
}

export function SidebarSyncPreviewModal({
  isOpen,
  onClose,
  findings,
  consultantNotes,
  pgrName,
  currentFindings,
  currentImpression,
  onConfirmSync,
  isSyncing,
}: SidebarSyncPreviewModalProps) {
  // Allow toggling specific findings
  const [selectedIds, setSelectedIds] = useState<string[]>(() => findings.map((f, i) => f.id || `f-${i}`));

  const toggleFinding = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const activeFindings = useMemo(
    () => findings.filter((f, i) => selectedIds.includes(f.id || `f-${i}`)),
    [findings, selectedIds]
  );

  // Compile proposed findings & impression HTML
  const { proposedFindings, proposedImpression } = useMemo(() => {
    const compiled = compileDiscussionToReportHtml(
      activeFindings,
      consultantNotes,
      pgrName
    );
    return {
      proposedFindings: compiled.findingsHtml,
      proposedImpression: compiled.impressionHtml,
    };
  }, [activeFindings, consultantNotes, pgrName]);

  // Diff findings
  const levelDiffs = useMemo(
    () => diffByLevels(currentFindings, proposedFindings),
    [currentFindings, proposedFindings]
  );

  const impressionTokens = useMemo(
    () => diffWords(currentImpression, proposedImpression),
    [currentImpression, proposedImpression]
  );

  const stats = useMemo(() => {
    let add = 0, rem = 0;
    levelDiffs.forEach((ld) => {
      const s = computeDiffStats(ld.tokens);
      add += s.addedWords;
      rem += s.removedWords;
    });
    return { add, rem };
  }, [levelDiffs]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" className="max-w-4xl max-h-[85vh]">
      <div className="flex flex-col h-[78vh] min-h-[460px] overflow-hidden bg-surface text-on-surface font-body text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-bold text-sm text-on-surface">Zero-Hallucination Sync Preview</span>
              <p className="text-[11px] text-secondary">Verify proposed changes before updating the active report body.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] text-primary font-mono">
            +{stats.add} / -{stats.rem} words
          </Badge>
        </div>

        {/* Level Checklist */}
        <div className="px-4 py-2 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-secondary shrink-0 font-semibold">Include Findings:</span>
          {findings.map((f, i) => {
            const fid = f.id || `f-${i}`;
            const isSelected = selectedIds.includes(fid);
            return (
              <button
                key={fid}
                type="button"
                onClick={() => toggleFinding(fid)}
                className={`px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary/15 border-primary/40 text-primary font-semibold'
                    : 'bg-surface border-outline-variant/30 text-secondary'
                }`}
              >
                {isSelected ? <CheckSquare className="w-3 h-3 text-primary" /> : <Square className="w-3 h-3" />}
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Diff Preview Pane */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-primary block">
              Findings Comparison (Active ↔ Proposed)
            </span>
            {levelDiffs.map((item) => (
              <div key={item.level} className="grid grid-cols-2 gap-3 p-2 rounded-lg border border-outline-variant/20 bg-surface-container-low text-xs">
                <div>
                  <span className="font-bold text-secondary block mb-0.5">{item.level} (Current)</span>
                  <p className="text-on-surface leading-relaxed">{item.oldText || <em className="text-secondary/50">None</em>}</p>
                </div>
                <div>
                  <span className="font-bold text-primary block mb-0.5">{item.level} (Proposed)</span>
                  <p className="leading-relaxed">
                    {item.tokens.map((tok, i) => (
                      tok.type === 'added' ? (
                        <span key={i} className="bg-emerald-500/20 text-emerald-400 font-semibold px-0.5 rounded mr-1">+{tok.value}</span>
                      ) : tok.type === 'removed' ? (
                        <span key={i} className="line-through bg-rose-500/20 text-rose-400 px-0.5 rounded mr-1">{tok.value}</span>
                      ) : (
                        <span key={i} className="text-on-surface mr-1">{tok.value}</span>
                      )
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t border-outline-variant/30">
            <span className="font-bold uppercase tracking-wider text-[10px] text-primary block">
              Proposed Impression
            </span>
            <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 text-xs">
              <p className="leading-relaxed">
                {impressionTokens.map((tok, i) => (
                  tok.type === 'added' ? (
                    <span key={i} className="bg-emerald-500/20 text-emerald-400 font-semibold px-0.5 rounded mr-1">+{tok.value}</span>
                  ) : tok.type === 'removed' ? (
                    <span key={i} className="line-through bg-rose-500/20 text-rose-400 px-0.5 rounded mr-1">{tok.value}</span>
                  ) : (
                    <span key={i} className="text-on-surface mr-1">{tok.value}</span>
                  )
                ))}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onClose} disabled={isSyncing} className="text-xs">
            Cancel
          </Button>

          <Button
            size="sm"
            variant="primary"
            disabled={isSyncing}
            onClick={async () => {
              await onConfirmSync(proposedFindings, proposedImpression);
              onClose();
            }}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isSyncing ? 'Syncing...' : 'Confirm & Sync to Report'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
