'use client';

import React, { useState } from 'react';
import { Edit3, History, Loader2, Check, AlertCircle, BookmarkPlus, GitCompare } from 'lucide-react';
import { ReportSyncStatus } from '@/hooks/use-report-editor-actions';
import { ReportingMode } from '@/hooks/use-reporting-layout';
import { ZenReportingModeSwitcher } from './zen-reporting-mode-switcher';
import { CopyButton } from '@/components/ui/copy-button';
import { formatPatientSummary } from '@/lib/clipboard';
import { notify } from '@/services/notification.service';
import { ZenTemplateSelector } from './zen-template-selector';
import { HmisNormalTemplate } from '@/types/templates';
import type { ReportSectionsState } from './report-section-dots';

export type ReportingTab = 'standard' | 'discussion';

interface ZenReportHeaderProps {
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientMrn?: string;
  accessionNumber?: string;
  modality?: string;
  studyDescription?: string;
  onEditPatient?: () => void;
  syncStatus?: ReportSyncStatus;
  savedTime?: string | null;
  reportingMode?: ReportingMode;
  onSelectReportingMode?: (mode: ReportingMode) => void;
  onMinimizeToFab?: () => void;
  onPopOutModal?: () => void;
  onMaximizeNotion?: () => void;
  reportSections?: ReportSectionsState;
  currentVersion?: number;
  onOpenHistory?: () => void;
  onOpenDiff?: () => void;
  onOpenInsights?: () => void;
  reportingTab?: ReportingTab;
  onSelectReportingTab?: (tab: ReportingTab) => void;
  onApplyTemplate?: (tpl: HmisNormalTemplate) => void;
  onSaveAsTemplate?: () => void;
}

export function ZenReportHeader({
  patientName = 'No Study Loaded',
  patientAge,
  patientGender,
  patientMrn,
  accessionNumber,
  modality = 'CT',
  studyDescription = 'Diagnostic Examination',
  onEditPatient,
  syncStatus = 'saved',
  savedTime,
  reportingMode,
  onSelectReportingMode,
  reportSections,
  currentVersion,
  onOpenHistory,
  onOpenDiff,
  onOpenInsights,
  reportingTab = 'standard',
  onSelectReportingTab,
  onApplyTemplate,
  onSaveAsTemplate,
}: ZenReportHeaderProps) {
  const [copiedField, setCopiedField] = useState<'acc' | 'mrn' | null>(null);

  const copyId = async (text: string, field: 'acc' | 'mrn', label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    notify.info(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const syncTitle =
    syncStatus === 'saving'
      ? 'Syncing changes to database in real-time...'
      : syncStatus === 'dirty'
      ? 'Unsaved edits pending sync...'
      : syncStatus === 'error'
      ? 'Database sync error, retrying...'
      : `Real-time synchronized with database (${savedTime || 'just now'})`;

  const showModeSwitcher = reportingMode && reportingMode !== 'full';
  const hasPatientData = patientName && patientName !== 'No Study Loaded' && patientName !== 'Unknown Patient';
  const ageGender = [patientAge ? `${patientAge}Y` : null, patientGender].filter(Boolean).join(' • ');
  const showMrn = patientMrn && patientMrn !== accessionNumber;

  return (
    <div className="px-3 py-1.5 bg-surface-container-low border-b border-outline-variant/40 flex flex-col gap-1 shrink-0 select-none">
      {/* Row 1: Patient Biographical Cluster & View/Layout Controls */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Patient Name (Truncated with tooltip) */}
          <span
            className="font-headline font-bold text-xs text-on-surface truncate max-w-[130px] sm:max-w-[180px] shrink-0"
            title={patientName}
          >
            {patientName}
          </span>

          {/* Age & Gender Chip */}
          {ageGender && (
            <span className="font-mono text-[10px] font-semibold text-secondary bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/40 shrink-0">
              {ageGender}
            </span>
          )}

          {/* Modality Badge */}
          <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
            {modality}
          </span>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {hasPatientData && (
            <CopyButton
              text={() =>
                formatPatientSummary({
                  patientName,
                  age: patientAge,
                  gender: patientGender,
                  modality,
                  accessionNumber,
                  patientMrn,
                  studyDescription,
                })
              }
              title="Copy Full Patient Demographics to Clipboard"
              ariaLabel="Copy Full Patient Demographics"
              size="xs"
            />
          )}

          {hasPatientData && onEditPatient && (
            <button
              type="button"
              onClick={onEditPatient}
              title="Edit patient biographical details"
              className="p-1 rounded text-secondary hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}

          {/* Real-time DB Sync Indicator */}
          <div className="flex items-center justify-center p-0.5" title={syncTitle}>
            {syncStatus === 'saving' ? (
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
            ) : syncStatus === 'dirty' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            ) : syncStatus === 'error' ? (
              <AlertCircle className="w-3 h-3 text-error" />
            ) : (
              <Check className="w-3 h-3 text-emerald-400" />
            )}
          </div>

          {/* Layout Mode Switcher */}
          {showModeSwitcher && onSelectReportingMode && (
            <ZenReportingModeSwitcher mode={reportingMode} onSelectMode={onSelectReportingMode} />
          )}
        </div>
      </div>

      {/* Row 2: Study Description, Fast Compact IDs & Clinical Templates */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
          {/* Study Description */}
          <span
            className="text-[11px] font-medium text-on-surface-variant truncate max-w-[120px] sm:max-w-[180px]"
            title={studyDescription}
          >
            {studyDescription}
          </span>

          {/* Accession Chip: 4-5 digit compact on mobile, click to copy */}
          {accessionNumber && (
            <button
              type="button"
              onClick={() => copyId(accessionNumber, 'acc', 'Accession')}
              className="flex items-center gap-1 font-mono text-[10px] text-secondary hover:text-on-surface bg-surface-container hover:bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant/40 transition-colors cursor-pointer shrink-0"
              title={`Click to copy full Accession: ${accessionNumber}`}
            >
              {copiedField === 'acc' ? (
                <span className="text-emerald-500 font-bold">✓ Copied!</span>
              ) : (
                <>
                  <span className="text-secondary/70">ACC:</span>
                  <span className="font-semibold sm:hidden">...{accessionNumber.slice(-5)}</span>
                  <span className="font-semibold hidden sm:inline">{accessionNumber}</span>
                </>
              )}
            </button>
          )}

          {/* MRN Chip: 4-5 digit compact on mobile, click to copy */}
          {showMrn && (
            <button
              type="button"
              onClick={() => copyId(patientMrn, 'mrn', 'MRN')}
              className="flex items-center gap-1 font-mono text-[10px] text-secondary hover:text-on-surface bg-surface-container hover:bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant/40 transition-colors cursor-pointer shrink-0"
              title={`Click to copy full MRN: ${patientMrn}`}
            >
              {copiedField === 'mrn' ? (
                <span className="text-emerald-500 font-bold">✓ Copied!</span>
              ) : (
                <>
                  <span className="text-secondary/70">MRN:</span>
                  <span className="font-semibold sm:hidden">...{patientMrn.slice(-5)}</span>
                  <span className="font-semibold hidden sm:inline">{patientMrn}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right side: Template Selector, Save Template, and History */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onApplyTemplate && (
            <ZenTemplateSelector
              modality={modality}
              studyDescription={studyDescription}
              onApplyTemplate={onApplyTemplate}
              onOpenSaveTemplate={onSaveAsTemplate}
            />
          )}

          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={onSaveAsTemplate}
              className="h-6 px-2 rounded border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-[11px] font-semibold text-on-surface flex items-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Save current technique, findings & impression as reusable template"
            >
              <BookmarkPlus className="w-3 h-3 text-primary" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              title="Inspect previous report draft versions"
              className="h-6 flex items-center gap-0.5 px-1.5 rounded border border-outline-variant/60 bg-surface-container hover:bg-surface-container-high text-secondary hover:text-primary transition-all font-mono text-[10px] font-semibold cursor-pointer active:scale-95 shrink-0"
            >
              <History className="w-2.5 h-2.5 text-primary" />
              <span>v{currentVersion || 1}</span>
            </button>
          )}

          {onOpenDiff && (
            <button
              type="button"
              onClick={onOpenDiff}
              title="Compare report revisions with Git-style Diff"
              className="h-6 flex items-center gap-1 px-1.5 rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition-all font-mono text-[10px] font-semibold cursor-pointer active:scale-95 shrink-0"
            >
              <GitCompare className="w-2.5 h-2.5" />
              <span>Diff</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
