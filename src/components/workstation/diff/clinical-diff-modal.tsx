'use client';

// Layer 4 (Presentation): Clinical Git-Style Revision Diff & Discrepancy Modal
// Invariant: Target < 250 lines, max 350 lines.

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import {
  GitCompare,
  RotateCcw,
  Check,
  Columns,
  AlignLeft,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  diffWords,
  diffByLevels,
  computeDiffStats,
  compareSidebarWithReport,
} from '@/lib/clinical-diff-engine';
import { DiffSideBySidePane } from './diff-side-by-side-pane';
import { DiffSidebarDiscrepancyPane } from './diff-sidebar-discrepancy-pane';

export interface RevisionSnapshot {
  id: string;
  version: number;
  status: string;
  authorName?: string;
  notes?: string;
  findings?: string;
  impression?: string;
  createdAt?: string;
}

interface ClinicalDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  revisions: RevisionSnapshot[];
  currentVersion: number;
  activeFindings: string;
  activeImpression: string;
  pgrDraftFindings?: string;
  pgrDraftImpression?: string;
  sidebarFindings?: Array<{ id?: string; label: string; text: string }>;
  consultantNotes?: string;
  onRestoreVersion?: (version: number) => void;
  onApproveAndLock?: () => void;
}

export function ClinicalDiffModal({
  isOpen,
  onClose,
  revisions,
  currentVersion,
  activeFindings,
  activeImpression,
  pgrDraftFindings,
  pgrDraftImpression,
  sidebarFindings = [],
  consultantNotes = '',
  onRestoreVersion,
  onApproveAndLock,
}: ClinicalDiffModalProps) {
  const [diffMode, setDiffMode] = useState<'pgr_vs_consultant' | 'revisions' | 'sidebar_vs_report'>('pgr_vs_consultant');
  const [viewLayout, setViewLayout] = useState<'side_by_side' | 'unified'>('side_by_side');
  const [revAIndex, setRevAIndex] = useState(0);
  const [revBIndex, setRevBIndex] = useState(0);

  const { oldFindings, newFindings, oldImpression, newImpression, titleA, titleB } = useMemo(() => {
    if (diffMode === 'pgr_vs_consultant') {
      const pgrF = pgrDraftFindings || revisions[revisions.length - 1]?.findings || '';
      const pgrI = pgrDraftImpression || revisions[revisions.length - 1]?.impression || '';
      return {
        oldFindings: pgrF,
        newFindings: activeFindings,
        oldImpression: pgrI,
        newImpression: activeImpression,
        titleA: 'PGR Initial Draft (v1_pgr_draft)',
        titleB: 'Consultant Active Report (v2_consultant_review)',
      };
    }

    const revA = revisions[revAIndex] || revisions[0] || {};
    const revB = revisions[revBIndex] || revisions[0] || {};
    return {
      oldFindings: revA.findings || '',
      newFindings: revB.findings || '',
      oldImpression: revA.impression || '',
      newImpression: revB.impression || '',
      titleA: `Revision v${revA.version || 1} (${revA.notes || 'Snapshot'})`,
      titleB: `Revision v${revB.version || currentVersion} (${revB.notes || 'Snapshot'})`,
    };
  }, [diffMode, pgrDraftFindings, pgrDraftImpression, activeFindings, activeImpression, revisions, revAIndex, revBIndex, currentVersion]);

  const findingsLevelDiffs = useMemo(() => diffByLevels(oldFindings, newFindings), [oldFindings, newFindings]);
  const impressionTokens = useMemo(() => diffWords(oldImpression, newImpression), [oldImpression, newImpression]);

  const findingsStats = useMemo(() => {
    let add = 0, rem = 0, unc = 0;
    findingsLevelDiffs.forEach((ld) => {
      const s = computeDiffStats(ld.tokens);
      add += s.addedWords;
      rem += s.removedWords;
      unc += s.unchangedWords;
    });
    return { added: add, removed: rem, unchanged: unc };
  }, [findingsLevelDiffs]);

  const sidebarDiscrepancies = useMemo(
    () => compareSidebarWithReport(sidebarFindings, consultantNotes, activeFindings, activeImpression),
    [sidebarFindings, consultantNotes, activeFindings, activeImpression]
  );

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" className="max-w-5xl max-h-[90vh]">
      <div className="flex flex-col h-[82vh] min-h-[500px] overflow-hidden bg-surface text-on-surface font-body text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-outline-variant/30 bg-surface-container-low flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-on-surface">Clinical Revision Diff Comparator</span>
            <Badge variant="outline" className="text-[10px] text-emerald-400 font-mono">
              +{findingsStats.added} / -{findingsStats.removed} words
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-surface-container border border-outline-variant/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewLayout('side_by_side')}
                className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${viewLayout === 'side_by_side' ? 'bg-primary text-on-primary font-semibold' : 'text-secondary'}`}
              >
                <Columns className="w-3 h-3" /> Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('unified')}
                className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${viewLayout === 'unified' ? 'bg-primary text-on-primary font-semibold' : 'text-secondary'}`}
              >
                <AlignLeft className="w-3 h-3" /> Unified
              </button>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-secondary hover:text-on-surface">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Mode Navigation Bar */}
        <div className="px-4 py-2 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDiffMode('pgr_vs_consultant')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${diffMode === 'pgr_vs_consultant' ? 'bg-primary/15 text-primary border border-primary/30 font-semibold' : 'text-secondary hover:bg-surface-container'}`}
            >
              PGR Draft ↔ Consultant
            </button>
            <button
              type="button"
              onClick={() => setDiffMode('revisions')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${diffMode === 'revisions' ? 'bg-primary/15 text-primary border border-primary/30 font-semibold' : 'text-secondary hover:bg-surface-container'}`}
            >
              Revision History Comparator
            </button>
            <button
              type="button"
              onClick={() => setDiffMode('sidebar_vs_report')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${diffMode === 'sidebar_vs_report' ? 'bg-primary/15 text-primary border border-primary/30 font-semibold' : 'text-secondary hover:bg-surface-container'}`}
            >
              Sidebar vs Report ({sidebarDiscrepancies.filter((d) => d.status !== 'synced').length} flags)
            </button>
          </div>

          {diffMode === 'revisions' && (
            <div className="flex items-center gap-2 text-[11px]">
              <select
                value={revAIndex}
                onChange={(e) => setRevAIndex(Number(e.target.value))}
                className="bg-surface-container border border-outline-variant/40 rounded px-1.5 py-0.5 text-xs text-on-surface"
              >
                {revisions.map((r, i) => (
                  <option key={r.id} value={i}>v{r.version}: {r.notes || r.status}</option>
                ))}
              </select>
              <ArrowRight className="w-3 h-3 text-secondary" />
              <select
                value={revBIndex}
                onChange={(e) => setRevBIndex(Number(e.target.value))}
                className="bg-surface-container border border-outline-variant/40 rounded px-1.5 py-0.5 text-xs text-on-surface"
              >
                {revisions.map((r, i) => (
                  <option key={r.id} value={i}>v{r.version}: {r.notes || r.status}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {diffMode === 'sidebar_vs_report' ? (
            <DiffSidebarDiscrepancyPane discrepancies={sidebarDiscrepancies} />
          ) : (
            <DiffSideBySidePane
              viewLayout={viewLayout}
              titleA={titleA}
              titleB={titleB}
              oldImpression={oldImpression}
              impressionTokens={impressionTokens}
              findingsLevelDiffs={findingsLevelDiffs}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (onRestoreVersion && revisions.length > 0) {
                const targetRev = revisions[revAIndex]?.version || 1;
                onRestoreVersion(targetRev);
                onClose();
              }
            }}
            className="text-xs text-rose-400 hover:bg-rose-500/10 gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert to Selected Version
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
              Close
            </Button>
            {onApproveAndLock && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onApproveAndLock();
                  notify.success('Report approved and milestone v3_hmis_ready locked!');
                  onClose();
                }}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Approve &amp; Lock for HMIS
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
