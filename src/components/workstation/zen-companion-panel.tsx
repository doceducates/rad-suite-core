'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenCompanionHeader } from './zen-companion-header';
import { ZenCompanionBody } from './zen-companion-body';
import { ZenCompanionPipFab } from './zen-companion-pip-fab';
import { ZenCompanionMobileModal } from './zen-companion-mobile-modal';
import { StitchPipResizeHandles } from './stitch-pip-resize-handles';
import { CompanionTab } from '@/services/companion-tab.service';
import type { DifferentialDiagnosisResult } from '@/services/ai-differential.service';
import { ReportEditorState, ReportSyncStatus } from '@/hooks/use-report-editor-actions';
import { usePipWindow } from '@/hooks/use-pip-window';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

export interface ZenCompanionPanelProps {
  docked?: boolean;
  isOpen?: boolean;
  defaultMinimized?: boolean;
  onClose?: () => void;
  activeTab: CompanionTab;
  onSelectTab: (tab: CompanionTab) => void;
  onToggleSplit?: () => void;
  onMaximize?: () => void;
  onResetSplit?: () => void;
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
  seriesName?: string;
  report?: ReportEditorState;
  setReport?: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId?: string;
  onSaveReport?: () => void;
  syncStatus?: ReportSyncStatus;
  savedTime?: string | null;
  findings: string;
  impression: string;
  clinicalHistory?: string;
  onInsertImpression: (text: string) => void;
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

export function ZenCompanionPanel({
  docked = false,
  isOpen = true,
  defaultMinimized,
  onClose,
  activeTab,
  onSelectTab,
  onToggleSplit,
  onMaximize,
  onResetSplit,
  accessionNumber,
  patientName,
  patientAge,
  patientGender,
  patientMrn,
  studyDescription,
  pgrName,
  modality = 'CT',
  isLocalCase,
  localCaseId,
  localSeries = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  seriesName,
  report,
  setReport,
  studyId,
  onSaveReport,
  syncStatus,
  savedTime,
  findings,
  impression,
  clinicalHistory,
  onInsertImpression,
  onSendToHmis, sendingHmis,
  onRevertHmis, revertingHmis,
  hmisNotice, onSyncGoogleDoc,
  syncingGoogleDoc, googleDocUrl,
  isTakenUpByMe, isClaimedByOther,
  claimedByName, onClaimCase, claimingCase,
  currentVersion, onVersionChange,
}: ZenCompanionPanelProps) {
  const isMobile = useIsMobile();
  const {
    rect,
    isMinimized,
    setIsMinimized,
    isDragging,
    isResizing,
    handleDragMouseDown,
    handleResizeMouseDown,
    resetToDefault,
    pillPos,
    isPillDragging,
    handlePillMouseDown,
    pillHasDraggedRef,
  } = usePipWindow({ defaultMinimized });

  const [ddxResult, setDdxResult] = useState<DifferentialDiagnosisResult | null>(null);
  const [isLoadingDdx, setIsLoadingDdx] = useState(false);

  const fetchDdx = useCallback(async () => {
    if (!findings.trim() || isLoadingDdx) return;
    try {
      setIsLoadingDdx(true);
      const res = await fetch('/api/ai/differential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findings, modality, clinicalHistory }),
      });
      const data = await res.json();
      if (data.success) {
        setDdxResult(data);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingDdx(false);
    }
  }, [findings, modality, clinicalHistory, isLoadingDdx]);

  useEffect(() => {
    if (activeTab === 'ddx' && !ddxResult && findings.trim()) {
      fetchDdx();
    }
  }, [activeTab, ddxResult, findings, fetchDdx]);

  const handleTabClick = (tab: CompanionTab) => {
    onSelectTab(tab);
    if (isMinimized) setIsMinimized(false);
  };

  if (!isOpen) return null;

  // Split View (Docked alongside PACS viewport)
  if (docked) {
    return (
      <div className="relative w-full h-full flex flex-col bg-card overflow-hidden select-none">
        <ZenCompanionHeader
          docked={true}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          onReset={onResetSplit}
          onToggleSplit={onToggleSplit}
          onMaximize={onMaximize}
          onMinimize={onClose}
          onClose={onClose}
          hasCriticalFinding={!!report?.criticalFinding}
        />
        <ZenCompanionBody
          activeTab={activeTab}
          accessionNumber={accessionNumber}
          patientName={patientName}
          patientAge={patientAge}
          patientGender={patientGender}
          patientMrn={patientMrn}
          studyDescription={studyDescription}
          pgrName={pgrName}
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
          onRefreshDdx={fetchDdx}
          onInsertImpression={onInsertImpression}
          findings={findings} impression={impression} clinicalHistory={clinicalHistory}
          onSendToHmis={onSendToHmis} sendingHmis={sendingHmis}
          onRevertHmis={onRevertHmis} revertingHmis={revertingHmis}
          hmisNotice={hmisNotice} onSyncGoogleDoc={onSyncGoogleDoc}
          syncingGoogleDoc={syncingGoogleDoc} googleDocUrl={googleDocUrl}
          isTakenUpByMe={isTakenUpByMe} isClaimedByOther={isClaimedByOther}
          claimedByName={claimedByName} onClaimCase={onClaimCase} claimingCase={claimingCase}
          currentVersion={currentVersion} onVersionChange={onVersionChange}
        />
      </div>
    );
  }

  // Mobile Screen-Covering Modal View
  if (isMobile) {
    return (
      <ZenCompanionMobileModal
        onClose={onClose} activeTab={activeTab} onSelectTab={onSelectTab}
        onToggleSplit={onToggleSplit} onMaximize={onMaximize} accessionNumber={accessionNumber}
        modality={modality} isLocalCase={isLocalCase} localCaseId={localCaseId}
        localSeries={localSeries} activeSeriesIndex={activeSeriesIndex} onSelectSeries={onSelectSeries}
        report={report} setReport={setReport} studyId={studyId} onSaveReport={onSaveReport}
        syncStatus={syncStatus} savedTime={savedTime} ddxResult={ddxResult} isLoadingDdx={isLoadingDdx}
        onRefreshDdx={fetchDdx} onInsertImpression={onInsertImpression} findings={findings}
        impression={impression} clinicalHistory={clinicalHistory} onSendToHmis={onSendToHmis}
        sendingHmis={sendingHmis} onRevertHmis={onRevertHmis} revertingHmis={revertingHmis}
        hmisNotice={hmisNotice} currentVersion={currentVersion} onVersionChange={onVersionChange}
      />
    );
  }

  // Desktop Floating PiP: Draggable Minimized Floating FAB Mode
  if (isMinimized) {
    return (
      <ZenCompanionPipFab
        pillPos={pillPos}
        onMouseDown={handlePillMouseDown}
        isPillDragging={isPillDragging}
        onRestore={(e) => {
          e.stopPropagation();
          if (!pillHasDraggedRef.current) setIsMinimized(false);
        }}
        activeTab={activeTab}
        seriesName={seriesName}
        activeSeriesIndex={activeSeriesIndex}
      />
    );
  }

  // Desktop Floating PiP: Draggable & Resizable Window
  return (
    <div
      style={{
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
      }}
      className={cn(
        'fixed z-50 bg-card rounded-2xl border border-primary/50 shadow-2xl shadow-black/50 flex flex-col overflow-visible select-none',
        isDragging && 'shadow-primary/30 ring-2 ring-primary/60 opacity-95 cursor-grabbing',
        isResizing && 'ring-1 ring-primary/60'
      )}
    >
      <ZenCompanionHeader
        docked={false}
        activeTab={activeTab}
        onSelectTab={handleTabClick}
        onDragMouseDown={handleDragMouseDown}
        onDoubleClickHeader={resetToDefault}
        onReset={resetToDefault}
        onToggleSplit={onToggleSplit}
        onMaximize={onMaximize}
        onMinimize={() => setIsMinimized(true)}
        onClose={() => setIsMinimized(true)}
        hasCriticalFinding={!!report?.criticalFinding}
      />
      <ZenCompanionBody
        activeTab={activeTab}
        accessionNumber={accessionNumber}
        patientName={patientName}
        patientAge={patientAge}
        patientGender={patientGender}
        patientMrn={patientMrn}
        studyDescription={studyDescription}
        pgrName={pgrName}
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
        onRefreshDdx={fetchDdx}
        onInsertImpression={onInsertImpression}
        findings={findings}
        impression={impression}
        clinicalHistory={clinicalHistory}
        onSendToHmis={onSendToHmis} sendingHmis={sendingHmis}
        onRevertHmis={onRevertHmis} revertingHmis={revertingHmis}
        hmisNotice={hmisNotice} onSyncGoogleDoc={onSyncGoogleDoc}
        syncingGoogleDoc={syncingGoogleDoc} googleDocUrl={googleDocUrl}
        isTakenUpByMe={isTakenUpByMe} isClaimedByOther={isClaimedByOther}
        claimedByName={claimedByName} onClaimCase={onClaimCase} claimingCase={claimingCase}
        isDragging={isDragging} isResizing={isResizing}
        currentVersion={currentVersion} onVersionChange={onVersionChange}
      />
      <StitchPipResizeHandles onResizeStart={handleResizeMouseDown} isResizing={isResizing} />

      {/* Global transparent pointer shield during floating window drag/resize */}
      {(isDragging || isResizing) && (
        <div className="fixed inset-0 z-[99998] cursor-move select-none bg-transparent" />
      )}
    </div>
  );
}
