'use client';

// Layer 4 (Presentation): Right Rail Positive Findings (70%) & Additional Notes (30%)
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscussionPositiveFindingsList } from '@/components/signout/discussion-positive-findings-list';
import { DiscussionNotesPanel } from '@/components/signout/discussion-notes-panel';
import {
  type DiscussionFinding,
  compileDiscussionToReportHtml,
  extractFindingsFromHtml,
  findingsToBulletHtml,
} from '@/lib/discussion-compiler';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';
import { useDiscussionPersistence } from '@/hooks/use-discussion-persistence';
import { notify } from '@/services/notification.service';
import { SidebarSyncPreviewModal } from './diff/sidebar-sync-preview-modal';

export interface ZenPositiveFindingsRailProps {
  report?: ReportEditorState;
  setReport?: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId?: string;
  reportId?: string;
  accessionNumber?: string;
  modality?: string;
  pgrName?: string;
  onSave?: (newStatus?: string, milestoneTag?: string) => Promise<any> | void;
  currentVersion?: number;
  initialFindings?: string;
}

export function ZenPositiveFindingsRail({
  report,
  setReport,
  studyId,
  reportId,
  accessionNumber,
  modality = 'MRI',
  pgrName = 'Resident Radiologist',
  onSave,
  currentVersion = 1,
  initialFindings = '',
}: ZenPositiveFindingsRailProps) {
  const [findingsHtml, setFindingsHtml] = useState('');
  const [findings, setFindings] = useState<DiscussionFinding[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const identifier = reportId || accessionNumber || studyId;

  const { isSavingDb, lastSavedTime, persistDiscussionToDb, flushSaveImmediate } =
    useDiscussionPersistence({
      identifier,
      findingsHtml,
      findings,
      notes,
      isLoaded,
    });

  // Load persistent discussion data from DB
  useEffect(() => {
    if (!identifier) return;
    let isCancelled = false;

    async function loadData() {
      try {
        const res = await fetch(`/api/reports/${encodeURIComponent(identifier!)}/discussion`);
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled && json.discussion) {
            const loadedFindings = json.discussion.positiveFindings || [];
            const loadedHtml =
              json.discussion.positiveFindingsHtml ||
              (loadedFindings.length > 0 ? findingsToBulletHtml(loadedFindings) : '');
            setFindings(loadedFindings);
            setFindingsHtml(loadedHtml);
            setNotes(json.discussion.consultantNotes || '');
            setIsLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load discussion summary in rail:', err);
      }

      if (!isCancelled) {
        if (initialFindings && initialFindings.trim()) {
          const extracted = extractFindingsFromHtml(initialFindings);
          setFindings(extracted);
          setFindingsHtml(extracted.length > 0 ? findingsToBulletHtml(extracted) : initialFindings);
        }
        setIsLoaded(true);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [identifier, initialFindings]);

  const handleFindingsHtmlChange = useCallback((newHtml: string) => {
    setFindingsHtml(newHtml);
    const parsed = extractFindingsFromHtml(newHtml);
    setFindings(parsed);
  }, []);

  const handleAddBullet = useCallback(() => {
    const newBullet = `<li><p><strong>New Finding:</strong> </p></li>`;
    setFindingsHtml((prev) => {
      let updated = '';
      if (!prev || prev === '<p></p>') {
        updated = `<ul>${newBullet}</ul>`;
      } else if (prev.includes('</ul>')) {
        updated = prev.replace(/<\/ul>$/, `${newBullet}</ul>`);
      } else {
        updated = `${prev}<ul>${newBullet}</ul>`;
      }
      const parsed = extractFindingsFromHtml(updated);
      setFindings(parsed);
      persistDiscussionToDb(updated, parsed, notes);
      return updated;
    });
  }, [notes, persistDiscussionToDb]);

  const handleClearFindings = useCallback(() => {
    setFindingsHtml('');
    setFindings([]);
    persistDiscussionToDb('', [], notes);
    notify.info('Positive findings cleared to baseline.');
  }, [notes, persistDiscussionToDb]);

  const handleSyncToMainReport = () => {
    if (!setReport) {
      notify.warning('Cannot sync: Report editor state not available.');
      return;
    }
    setIsPreviewOpen(true);
  };

  const handleConfirmSync = async (compiledFindings: string, impressionHtml: string) => {
    if (!setReport) return;
    setIsSyncing(true);
    try {
      await persistDiscussionToDb(findingsHtml, findings, notes);

      setReport((prev) => ({
        ...prev,
        findings: compiledFindings,
        impression: impressionHtml,
      }));

      const nextVer = (currentVersion || 1) + 1;
      const tag = `v2_consultant_review`;

      if (onSave) {
        await onSave(undefined, tag);
      } else if (identifier) {
        await fetch(`/api/reports/${encodeURIComponent(identifier)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            findings: compiledFindings,
            impression: impressionHtml,
            milestoneTag: tag,
          }),
        });
      }

      notify.success(`Main report synced with Positive Findings (v${nextVer})!`);
    } catch (err: any) {
      notify.error('Failed to sync to main report', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 overflow-hidden font-body text-xs text-on-surface bg-surface select-text">
      {/* Row 1: Positive Findings (70% Vertical Height) */}
      <div className="flex-[7] min-h-0 overflow-hidden flex flex-col p-2.5 bg-surface">
        <DiscussionPositiveFindingsList
          findingsHtml={findingsHtml}
          onFindingsHtmlChange={handleFindingsHtmlChange}
          findingsCount={findings.length}
          onAddBullet={handleAddBullet}
          onClear={handleClearFindings}
          onBlur={flushSaveImmediate}
          modality={modality}
        />
      </div>

      {/* Row 2: Additional Notes (30% Vertical Height) */}
      <div
        onBlur={flushSaveImmediate}
        className="flex-[3] min-h-0 overflow-hidden flex flex-col p-2.5 bg-surface-container-lowest/30 border-t border-outline-variant/30"
      >
        <DiscussionNotesPanel
          notes={notes}
          onNotesChange={setNotes}
          onClearNotes={() => {
            setNotes('');
            persistDiscussionToDb(findingsHtml, findings, '');
          }}
        />
      </div>

      {/* Bottom Sync & Persistence Status Bar */}
      <div className="px-3 py-1.5 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5 text-[10px] text-secondary">
          {isSavingDb && (
            <span className="inline-flex items-center gap-1 text-primary/80 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {!isSavingDb && lastSavedTime && (
            <span>Saved at {lastSavedTime}</span>
          )}
          {!isSavingDb && !lastSavedTime && (
            <span>{findings.length === 0 ? 'Baseline' : `${findings.length} findings`}</span>
          )}
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleSyncToMainReport}
          isLoading={isSyncing}
          className="font-semibold text-[11px] gap-1 py-1 px-2.5 shadow-2xs cursor-pointer h-7"
          title="Compile positive findings & consultant notes directly into the main report editor"
        >
          <Sparkles className="w-3 h-3 text-on-primary" />
          <span>Sync to Report</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Button>
      </div>

      <SidebarSyncPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        findings={findings}
        consultantNotes={notes}
        pgrName={pgrName}
        currentFindings={report?.findings || ''}
        currentImpression={report?.impression || ''}
        onConfirmSync={handleConfirmSync}
        isSyncing={isSyncing}
      />
    </div>
  );
}
