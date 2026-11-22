'use client';

import React from 'react';
import { ZenCompanionHeader } from './zen-companion-header';
import { ZenCompanionBody } from './zen-companion-body';
import { CompanionTab } from '@/services/companion-tab.service';
import type { DifferentialDiagnosisResult } from '@/services/ai-differential.service';
import { ReportEditorState, ReportSyncStatus } from '@/hooks/use-report-editor-actions';

interface ZenCompanionMobileModalProps {
  onClose?: () => void;
  activeTab: CompanionTab;
  onSelectTab: (tab: CompanionTab) => void;
  onToggleSplit?: () => void;
  onMaximize?: () => void;
  accessionNumber: string;
  modality: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: any[];
  activeSeriesIndex?: number;
  onSelectSeries?: (idx: number) => void;
  report?: ReportEditorState;
  setReport?: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId?: string;
  onSaveReport?: () => void;
  syncStatus?: ReportSyncStatus;
  savedTime?: string | null;
  ddxResult: DifferentialDiagnosisResult | null;
  isLoadingDdx: boolean;
  onRefreshDdx: () => void;
  onInsertImpression: (text: string) => void;
  findings: string;
  impression: string;
  clinicalHistory?: string;
  onSendToHmis?: (options?: { deepVerify?: boolean }) => void;
  sendingHmis?: boolean;
  onRevertHmis?: () => void;
  revertingHmis?: boolean;
  hmisNotice?: string | null;
  currentVersion?: number;
  onVersionChange?: (version: number) => void;
}

export function ZenCompanionMobileModal({
  onClose,
  activeTab,
  onSelectTab,
  onToggleSplit,
  onMaximize,
  accessionNumber,
  modality,
  isLocalCase,
  localCaseId,
  localSeries,
  activeSeriesIndex,
  onSelectSeries,
  report,
  setReport,
  studyId,
  onSaveReport,
  syncStatus,
  savedTime,
  ddxResult,
  isLoadingDdx,
  onRefreshDdx,
  onInsertImpression,
  findings,
  impression,
  clinicalHistory,
  onSendToHmis,
  sendingHmis,
  onRevertHmis,
  revertingHmis,
  hmisNotice,
  currentVersion,
  onVersionChange,
}: ZenCompanionMobileModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 select-none animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close modal overlay" />
      <div className="relative z-10 w-full h-full max-w-7xl max-h-[98vh] bg-surface rounded-2xl border border-outline-variant/70 shadow-2xl flex flex-col overflow-hidden">
        <ZenCompanionHeader
          docked={false}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onToggleSplit={onToggleSplit}
          onMaximize={onMaximize}
          onMinimize={onClose}
          onClose={onClose}
          hasCriticalFinding={!!report?.criticalFinding}
        />
        <ZenCompanionBody
          activeTab={activeTab}
          accessionNumber={accessionNumber}
          modality={modality}
          isLocalCase={isLocalCase}
          localCaseId={localCaseId}
          localSeries={localSeries}
          activeSeriesIndex={activeSeriesIndex}
          onSelectSeries={onSelectSeries}
          report={report}
          setReport={setReport}
          studyId={studyId}
          onSaveReport={onSaveReport}
          syncStatus={syncStatus}
          savedTime={savedTime}
          ddxResult={ddxResult}
          isLoadingDdx={isLoadingDdx}
          onRefreshDdx={onRefreshDdx}
          onInsertImpression={onInsertImpression}
          findings={findings}
          impression={impression}
          clinicalHistory={clinicalHistory}
          onSendToHmis={onSendToHmis}
          sendingHmis={sendingHmis}
          onRevertHmis={onRevertHmis}
          revertingHmis={revertingHmis}
          hmisNotice={hmisNotice}
          currentVersion={currentVersion}
          onVersionChange={onVersionChange}
        />
      </div>
    </div>
  );
}
