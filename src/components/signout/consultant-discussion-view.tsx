'use client';

// Layer 4 (Presentation): Consultant Discussion & Sign-Out Screen
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscussionPositiveFindingsList } from './discussion-positive-findings-list';
import { DiscussionNotesPanel } from './discussion-notes-panel';
import {
  type DiscussionFinding,
  compileDiscussionToReportHtml,
  extractFindingsFromHtml,
  findingsToBulletHtml,
} from '@/lib/discussion-compiler';
import { ReportEditorState } from '@/hooks/use-report-editor-actions';
import { useDiscussionPersistence } from '@/hooks/use-discussion-persistence';
import { notify } from '@/services/notification.service';

interface ConsultantDiscussionViewProps {
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  modality?: string;
  studyDescription?: string;
  pgrName: string;
  onSwitchToStandard?: () => void;
  studyId?: string;
  accessionNumber?: string;
  reportId?: string;
  onSave?: (newStatus?: string, milestoneTag?: string) => Promise<any> | void;
  currentVersion?: number;
  reportStyle?: string;
  patientAge?: string | number;
}

export function ConsultantDiscussionView({
  report, setReport, modality = 'MRI', studyDescription = 'MRI Spine',
  pgrName, onSwitchToStandard, studyId, accessionNumber, reportId, onSave,
  currentVersion = 1, reportStyle = 'categorized', patientAge,
}: ConsultantDiscussionViewProps) {
  const [findingsHtml, setFindingsHtml] = useState('');
  const [findings, setFindings] = useState<DiscussionFinding[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAiSynthesizing, setIsAiSynthesizing] = useState(false);

  const identifier = reportId || accessionNumber || studyId;

  // Persistence hook handling high-speed 400ms debounce and immediate flush on unmount/blur
  const { isSavingDb, lastSavedTime, persistDiscussionToDb, flushSaveImmediate } =
    useDiscussionPersistence({
      identifier,
      findingsHtml,
      findings,
      notes,
      isLoaded,
    });

  // 1. Fetch persistent discussion data from database
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
        console.warn('Could not load discussion summary from database:', err);
      }

      if (!isCancelled) {
        setIsLoaded(true);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [identifier]);

  // Findings handlers
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

  const handleResetAll = useCallback(() => {
    setFindingsHtml('');
    setFindings([]);
    setNotes('');
    persistDiscussionToDb('', [], '');
    notify.info('Discussion cleared to baseline normal.');
  }, [persistDiscussionToDb]);

  // 3. Sync to main report & create new immutable version
  const handleSyncToMainReport = async () => {
    setIsSyncing(true);
    try {
      await persistDiscussionToDb(findingsHtml, findings, notes);
      const { findingsHtml: compiledFindings, impressionHtml } = compileDiscussionToReportHtml(
        findingsHtml || findings,
        notes,
        pgrName,
        report.technique
      );

      setReport((prev) => ({
        ...prev,
        findings: compiledFindings,
        impression: impressionHtml,
      }));

      const nextVer = (currentVersion || 1) + 1;
      const tag = `Synced from Discussion (v${nextVer})`;

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

      notify.success(`Report synced and Version ${nextVer} recorded!`);
      onSwitchToStandard?.();
    } catch (err: any) {
      notify.error('Failed to sync discussion to main report', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAiSynthesizeReport = async () => {
    setIsAiSynthesizing(true);
    try {
      await persistDiscussionToDb(findingsHtml, findings, notes);
      const effectiveFindings = findingsHtml || (findings.length > 0 ? findingsToBulletHtml(findings) : '') || report.findings;
      const res = await fetch('/api/ai/polish-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalHistory: report.clinicalHistory,
          technique: report.technique,
          findings: effectiveFindings,
          impression: report.impression,
          modality,
          studyDescription,
          patientAge: patientAge !== undefined && patientAge !== null ? String(patientAge) : undefined,
          radiologistName: pgrName,
          reportStyle: reportStyle || 'categorized',
          consultantNotes: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed synthesizing report');
      }

      setReport((prev) => ({
        ...prev,
        clinicalHistory: data.clinicalHistory || prev.clinicalHistory,
        technique: data.technique || prev.technique,
        findings: data.findings || prev.findings,
        impression: data.impression || prev.impression,
      }));

      const nextVer = (currentVersion || 1) + 1;
      const tag = `v${nextVer} - Consultant AI Synthesized`;

      if (onSave) {
        await onSave(undefined, tag);
      }

      notify.success(`Full report synthesized with AI incorporating consultant review! (v${nextVer})`);
      onSwitchToStandard?.();
    } catch (err: any) {
      notify.error(err.message || 'Could not synthesize report with AI');
    } finally {
      setIsAiSynthesizing(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 overflow-hidden font-body text-xs text-on-surface bg-surface select-text">
      {/* 1. Header Bar: Status, Saving Indicator & Reset */}
      <div className="px-4 py-2 border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-on-surface">
            {studyDescription || modality}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container border border-outline-variant/40 text-secondary">
            {findings.length === 0 ? 'Unremarkable Baseline' : `${findings.length} Positive Findings`}
          </span>
          {isSavingDb && (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary/80 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving immediately...
            </span>
          )}
          {!isSavingDb && lastSavedTime && (
            <span className="text-[10px] text-secondary/60">
              Saved at {lastSavedTime}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          title="Clear all positive findings and consultant notes to baseline"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Baseline</span>
        </button>
      </div>

      {/* 2. Clean 50/50 Split Workspace: Left = Positive Findings Bullet Editor | Right = Additional Notes */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-outline-variant/30 overflow-hidden">
        {/* Left Column (50%): Positive Findings Editor */}
        <div className="p-3 sm:p-4 overflow-hidden flex flex-col h-full bg-surface">
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

        {/* Right Column (50%): Notes & Voice Dictation Panel */}
        <div
          onBlur={flushSaveImmediate}
          className="p-3 sm:p-4 overflow-hidden flex flex-col h-full bg-surface-container-lowest/30"
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
      </div>

      {/* 3. Bottom Action Bar */}
      <div className="px-4 py-2 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between shrink-0 select-none">
        <span className="text-[11px] text-secondary">
          {findings.length === 0
            ? 'Baseline normal • Ready to sync'
            : `${findings.length} positive ${findings.length === 1 ? 'finding' : 'findings'} ready to compile • Report v${currentVersion}`}
        </span>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncToMainReport}
            isLoading={isSyncing}
            disabled={isAiSynthesizing}
            className="text-xs gap-1 cursor-pointer"
            title="Fast direct compile without calling AI"
          >
            <span>Direct Sync (v{(currentVersion || 1) + 1})</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleAiSynthesizeReport}
            isLoading={isAiSynthesizing}
            disabled={isSyncing}
            className="font-semibold text-xs gap-1.5 shadow-xs px-3.5 cursor-pointer bg-primary text-on-primary"
            title="Use OpenRouter AI to integrate consultant notes, apply report style, and synthesize full report"
          >
            <Sparkles className="w-3.5 h-3.5 text-on-primary" />
            <span>AI Synthesize Report (v{(currentVersion || 1) + 1})</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
