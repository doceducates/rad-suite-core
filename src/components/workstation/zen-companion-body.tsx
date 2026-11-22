'use client';

import React, { useState } from 'react';
import { ZenDicomViewer } from './zen-dicom-viewer';
import { CopilotDdxTab } from './copilot-ddx-tab';
import { CopilotChatTab } from './copilot-chat-tab';
import { CopilotGuidanceTab } from './copilot-guidance-tab';
import { ZenReportCanvas } from './zen-report-canvas';
import { ZenAtlasCompanionPane } from './zen-atlas-companion-pane';
import { CompanionTab } from '@/services/companion-tab.service';
import type { DifferentialDiagnosisResult } from '@/services/ai-differential.service';
import { ReportEditorState, ReportSyncStatus } from '@/hooks/use-report-editor-actions';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZenCompanionBodyProps {
  activeTab: CompanionTab;
  accessionNumber: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientMrn?: string;
  studyDescription?: string;
  pgrName?: string;
  modality?: string;
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
  ddxResult?: DifferentialDiagnosisResult | null;
  isLoadingDdx?: boolean;
  onRefreshDdx?: () => void;
  onInsertImpression: (text: string) => void;
  findings: string;
  impression: string;
  clinicalHistory?: string;
  isDragging?: boolean;
  isResizing?: boolean;
  onSendToHmis?: (options?: { deepVerify?: boolean }) => void;
  sendingHmis?: boolean;
  onRevertHmis?: () => void;
  revertingHmis?: boolean;
  hmisNotice?: string | null;
  onSyncGoogleDoc?: () => void;
  syncingGoogleDoc?: boolean;
  googleDocUrl?: string | null;
  isTakenUpByMe?: boolean;
  isClaimedByOther?: boolean;
  claimedByName?: string;
  onClaimCase?: () => void;
  claimingCase?: boolean;
  currentVersion?: number;
  onVersionChange?: (version: number) => void;
}

export function ZenCompanionBody({
  activeTab,
  accessionNumber,
  patientName,
  patientAge,
  patientGender,
  patientMrn,
  studyDescription,
  pgrName = 'Reporting Radiologist',
  modality = 'CT',
  isLocalCase,
  localCaseId,
  localSeries = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  report,
  setReport,
  studyId = '',
  onSaveReport,
  syncStatus,
  savedTime,
  ddxResult,
  isLoadingDdx = false,
  onRefreshDdx,
  onInsertImpression,
  findings,
  impression,
  clinicalHistory,
  isDragging,
  isResizing,
  onSendToHmis,
  sendingHmis,
  onRevertHmis,
  revertingHmis,
  hmisNotice,
  onSyncGoogleDoc,
  syncingGoogleDoc,
  googleDocUrl,
  isTakenUpByMe,
  isClaimedByOther,
  claimedByName,
  onClaimCase,
  claimingCase,
  currentVersion,
  onVersionChange,
}: ZenCompanionBodyProps) {
  const [isDragOverSeries, setIsDragOverSeries] = useState(false);

  const handleSeriesDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverSeries(true);
  };

  const handleSeriesDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSeries(false);
  };

  const handleSeriesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSeries(false);
    const raw = e.dataTransfer.getData('application/rad-series-index') || e.dataTransfer.getData('text/plain');
    if (raw) {
      const idx = parseInt(raw, 10);
      if (!isNaN(idx) && onSelectSeries) {
        onSelectSeries(idx);
      }
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-background flex flex-col min-h-0 select-text">
      {/* Tab 1: Clinical Report Canvas */}
      {activeTab === 'report' && report && setReport && (
        <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
          <ZenReportCanvas
            report={report}
            setReport={setReport}
            studyId={studyId}
            modality={modality}
            patientName={patientName}
            patientAge={patientAge}
            patientGender={patientGender}
            patientMrn={patientMrn}
            studyDescription={studyDescription}
            accessionNumber={accessionNumber}
            pgrName={pgrName}
            onSave={onSaveReport || (() => {})}
            syncStatus={syncStatus}
            savedTime={savedTime}
            currentVersion={currentVersion}
            onVersionChange={onVersionChange}
            scrollMode="unified"
            onSendToHmis={onSendToHmis}
            sendingHmis={sendingHmis}
            onRevertHmis={onRevertHmis}
            revertingHmis={revertingHmis}
            hmisNotice={hmisNotice}
            onSyncGoogleDoc={onSyncGoogleDoc}
            syncingGoogleDoc={syncingGoogleDoc}
            googleDocUrl={googleDocUrl}
            isTakenUpByMe={isTakenUpByMe}
            isClaimedByOther={isClaimedByOther}
            claimedByName={claimedByName}
            onClaimCase={onClaimCase}
            claimingCase={claimingCase}
          />
        </div>
      )}

      {/* Tab 2: Interactive DICOM Viewer with Drag-and-Drop Series Zone */}
      {activeTab === 'images' && (
        <div
          onDragOver={handleSeriesDragOver}
          onDragLeave={handleSeriesDragLeave}
          onDrop={handleSeriesDrop}
          className={cn(
            'flex-1 relative bg-black overflow-hidden flex flex-col transition-all',
            isDragOverSeries && 'ring-4 ring-primary ring-inset'
          )}
        >
          <ZenDicomViewer
            accessionNumber={accessionNumber}
            modality={modality}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            localSeries={localSeries}
            activeSeriesIndex={activeSeriesIndex}
          />

          {/* Visual Drop Target Highlight when dragging series thumbnail */}
          {isDragOverSeries && (
            <div className="absolute inset-0 z-40 bg-primary/20 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none gap-2">
              <span className="p-3 rounded-2xl bg-surface-container border border-primary/60 text-primary shadow-2xl flex items-center gap-2 text-xs font-mono font-bold animate-bounce">
                <Layers className="w-5 h-5" />
                <span>Drop Series to Inspect in Viewport</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Differential Diagnosis */}
      {activeTab === 'ddx' && (
        <CopilotDdxTab
          ddxResult={ddxResult || null}
          isLoading={isLoadingDdx}
          onRefresh={onRefreshDdx || (() => {})}
          onInsertImpression={onInsertImpression}
          findings={findings}
        />
      )}

      {/* Tab 4: Interactive Copilot Chat */}
      {activeTab === 'chat' && (
        <CopilotChatTab
          findings={findings}
          impression={impression}
          modality={modality}
          clinicalHistory={clinicalHistory}
          onInsertImpression={onInsertImpression}
          onApplyReportChanges={
            setReport
              ? (changes) => setReport((prev) => ({ ...prev, ...changes }))
              : undefined
          }
        />
      )}

      {/* Tab 5: Academic Reference Pearls */}
      {activeTab === 'guidance' && (
        <CopilotGuidanceTab
          pearls={ddxResult?.knowledgePearls}
          onInsertImpression={onInsertImpression}
          modality={modality}
        />
      )}

      {/* Tab 6: IMAIOS eAnatomy Cross-Sectional Atlas */}
      {activeTab === 'atlas' && (
        <ZenAtlasCompanionPane
          modality={modality}
          studyDescription={studyDescription}
        />
      )}

      {/* Transparent overlay during drag/resize to prevent child event interception */}
      {(isDragging || isResizing) && <div className="absolute inset-0 z-50 bg-transparent" />}
    </div>
  );
}
