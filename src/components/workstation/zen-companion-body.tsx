'use client';

import React, { useState } from 'react';
import { ZenDicomViewportContainer } from './zen-dicom-viewport-container';
import { ZenInsightsDdxTab } from './zen-insights-ddx-tab';
import { CopilotChatTab } from './copilot-chat-tab';
import { ZenRadiopaediaPane } from './zen-radiopaedia-pane';
import { ZenPositiveFindingsRail } from './zen-positive-findings-rail';
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
  patientAge?: string | number;
  patientGender?: string;
  patientMrn?: string;
  studyDescription?: string;
  pgrName?: string;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: any[];
  seriesList?: any[];
  activeSeriesIndex?: number;
  onSelectSeries?: (idx: number) => void;
  onSwapCenter?: () => void;
  report?: ReportEditorState;
  setReport?: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId?: string;
  reportId?: string;
  onSaveReport?: (newStatus?: string, milestoneTag?: string) => Promise<any> | void;
  syncStatus?: ReportSyncStatus;
  savedTime?: string | null;
  ddxResult?: DifferentialDiagnosisResult | null;
  isLoadingDdx?: boolean;
  onRefreshDdx?: () => void;
  onInsertImpression: (text: string) => void;
  findings: string;
  impression: string;
  clinicalHistory?: string;
  patientClinicalNotes?: string;
  initialContentJson?: any;
  onUpdateContentJson?: (json: any) => void;
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
  seriesList = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  onSwapCenter,
  report,
  setReport,
  studyId = '',
  reportId,
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
  patientClinicalNotes,
  initialContentJson,
  onUpdateContentJson,
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

  const handleSeriesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverSeries(false);
    const raw = e.dataTransfer.getData('application/rad-series-index') || e.dataTransfer.getData('text/plain');
    if (raw) {
      const idx = parseInt(raw, 10);
      if (!isNaN(idx) && onSelectSeries) onSelectSeries(idx);
    }
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-background flex flex-col min-h-0 select-text">
      {/* 1. Images: PACS DICOM Viewer */}
      {activeTab === 'images' && (
        <div
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOverSeries(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragOverSeries(false); }}
          onDrop={handleSeriesDrop}
          className={cn('flex-1 relative bg-black overflow-hidden flex flex-col', isDragOverSeries && 'ring-4 ring-primary ring-inset')}
        >
          <ZenDicomViewportContainer
            accessionNumber={accessionNumber}
            modality={modality}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            localSeries={localSeries}
            seriesList={seriesList}
            activeSeriesIndex={activeSeriesIndex}
            onSelectSeries={onSelectSeries}
            onSwapCenter={onSwapCenter}
            isCompanion={true}
          />
          {isDragOverSeries && (
            <div className="absolute inset-0 z-40 bg-primary/20 backdrop-blur-xs flex items-center justify-center pointer-events-none">
              <span className="p-3 rounded-2xl bg-surface-container border border-primary/60 text-primary shadow-2xl flex items-center gap-2 text-xs font-mono font-bold animate-bounce">
                <Layers className="w-5 h-5" />
                <span>Drop Series to Inspect</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Insights & DDx: Merged Differentials + Insights + Pearls */}
      {activeTab === 'insights_ddx' && (
        <ZenInsightsDdxTab
          findings={findings}
          impression={impression}
          clinicalHistory={clinicalHistory}
          modality={modality}
          studyDescription={studyDescription}
          patientAge={patientAge}
          patientGender={patientGender}
          studyId={studyId}
          reportId={reportId}
          accessionNumber={accessionNumber}
          initialContentJson={initialContentJson}
          patientClinicalNotes={patientClinicalNotes}
          onInsertImpression={onInsertImpression}
          onUpdateContentJson={onUpdateContentJson}
          ddxResult={ddxResult}
          isLoadingDdx={isLoadingDdx}
          onRefreshDdx={onRefreshDdx}
        />
      )}

      {/* 3. AI Copilot Chat */}
      {activeTab === 'chat' && (
        <CopilotChatTab
          findings={findings}
          impression={impression}
          modality={modality}
          clinicalHistory={clinicalHistory}
          onInsertImpression={onInsertImpression}
          onApplyReportChanges={setReport ? (c) => setReport((prev) => ({ ...prev, ...c })) : undefined}
        />
      )}

      {/* 4. Radiopaedia Reference Articles */}
      {activeTab === 'radiopaedia' && <ZenRadiopaediaPane isResizing={isResizing} />}

      {/* 5. Positive Findings Checklist */}
      {activeTab === 'findings' && (
        <ZenPositiveFindingsRail
          report={report}
          setReport={setReport}
          studyId={studyId}
          reportId={reportId}
          accessionNumber={accessionNumber}
          modality={modality}
          pgrName={pgrName}
          onSave={onSaveReport}
          currentVersion={currentVersion}
          initialFindings={findings}
        />
      )}

      {/* 6. Clinical Report Canvas */}
      {activeTab === 'report' && report && setReport && (
        <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col">
          <ZenReportCanvas
            report={report}
            setReport={setReport}
            studyId={studyId}
            modality={modality}
            patientName={patientName}
            patientAge={String(patientAge || '')}
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

      {/* 7. IMAIOS eAnatomy Atlas */}
      {activeTab === 'atlas' && (
        <ZenAtlasCompanionPane modality={modality} studyDescription={studyDescription} />
      )}

      {(isDragging || isResizing) && <div className="absolute inset-0 z-50 bg-transparent" />}
    </div>
  );
}
