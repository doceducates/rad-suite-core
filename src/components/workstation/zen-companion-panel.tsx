'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZenCompanionHeader, CompanionWindowMode } from './zen-companion-header';
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
import type { WorkstationCenterView } from '@/hooks/use-three-column-layout';

export interface ZenCompanionPanelProps {
  mode?: CompanionWindowMode; docked?: boolean; isOpen?: boolean; defaultMinimized?: boolean;
  onClose?: () => void; activeTab: CompanionTab; onSelectTab: (tab: CompanionTab) => void;
  centerView?: WorkstationCenterView; onSwapCenter?: () => void;
  onToggleSplit?: () => void; onToggleFloat?: () => void; onMaximize?: () => void;
  onRestore?: () => void; onMinimize?: () => void; onReset?: () => void; onResetSplit?: () => void;
  accessionNumber: string; patientName?: string; patientAge?: string | number;
  patientGender?: string; patientMrn?: string; studyDescription?: string; pgrName?: string;
  modality?: string; isLocalCase?: boolean; localCaseId?: string; localSeries?: any[];
  seriesList?: any[]; activeSeriesIndex?: number; onSelectSeries?: (idx: number) => void; seriesName?: string;
  report?: ReportEditorState; setReport?: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId?: string; reportId?: string;
  onSaveReport?: (newStatus?: string, milestoneTag?: string) => Promise<any> | void;
  syncStatus?: ReportSyncStatus; savedTime?: string | null;
  findings: string; impression: string; clinicalHistory?: string; patientClinicalNotes?: string;
  initialContentJson?: any; onUpdateContentJson?: (json: any) => void;
  onInsertImpression: (text: string) => void;
  onSendToHmis?: (options?: { deepVerify?: boolean }) => void; sendingHmis?: boolean;
  onRevertHmis?: () => void; revertingHmis?: boolean;
  hmisNotice?: string | null; onSyncGoogleDoc?: () => void;
  syncingGoogleDoc?: boolean; googleDocUrl?: string | null;
  isTakenUpByMe?: boolean; isClaimedByOther?: boolean; claimedByName?: string;
  onClaimCase?: () => void; claimingCase?: boolean;
  currentVersion?: number; onVersionChange?: (version: number) => void;
}

export function ZenCompanionPanel({
  mode: propMode,
  docked = false,
  isOpen = true,
  defaultMinimized,
  onClose,
  activeTab,
  onSelectTab,
  centerView,
  onSwapCenter,
  onToggleSplit,
  onToggleFloat,
  onMaximize,
  onRestore,
  onMinimize,
  onReset,
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
  seriesList = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  seriesName,
  report,
  setReport,
  studyId,
  reportId,
  onSaveReport,
  syncStatus,
  savedTime,
  findings,
  impression,
  clinicalHistory,
  patientClinicalNotes,
  initialContentJson,
  onUpdateContentJson,
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
  const activeMode: CompanionWindowMode = propMode || (docked ? 'docked' : 'floating');

  const {
    rect,
    isMinimized: pipMinimized,
    setIsMinimized: setPipMinimized,
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
      if (data.success) setDdxResult(data);
    } catch {
      // non-blocking
    } finally {
      setIsLoadingDdx(false);
    }
  }, [findings, modality, clinicalHistory, isLoadingDdx]);

  useEffect(() => {
    if (activeTab === 'insights_ddx' && !ddxResult && findings.trim()) {
      fetchDdx();
    }
  }, [activeTab, ddxResult, findings, fetchDdx]);

  if (!isOpen) return null;

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

  // Floating Minimized to FAB
  if (activeMode === 'floating' && pipMinimized) {
    return (
      <ZenCompanionPipFab
        pillPos={pillPos}
        onMouseDown={handlePillMouseDown}
        isPillDragging={isPillDragging}
        onRestore={(e) => {
          e.stopPropagation();
          if (!pillHasDraggedRef.current) setPipMinimized(false);
        }}
        onPopout={(e) => {
          e?.stopPropagation();
          setPipMinimized(false);
        }}
        activeTab={activeTab}
        seriesName={seriesName}
        activeSeriesIndex={activeSeriesIndex}
      />
    );
  }

  const commonBodyProps = {
    activeTab, accessionNumber, patientName, patientAge, patientGender, patientMrn,
    studyDescription, pgrName, modality, isLocalCase, localCaseId, localSeries, seriesList,
    activeSeriesIndex, onSelectSeries, onSwapCenter, report, setReport, studyId, reportId,
    onSaveReport, syncStatus, savedTime, ddxResult, isLoadingDdx, onRefreshDdx: fetchDdx,
    onInsertImpression, findings, impression, clinicalHistory, patientClinicalNotes,
    initialContentJson, onUpdateContentJson, onSendToHmis, sendingHmis, onRevertHmis,
    revertingHmis, hmisNotice, onSyncGoogleDoc, syncingGoogleDoc, googleDocUrl,
    isTakenUpByMe, isClaimedByOther, claimedByName, onClaimCase, claimingCase,
    currentVersion, onVersionChange,
  };

  // Maximized Stage Overlay (Covers entire reporting stage)
  if (activeMode === 'maximized') {
    return (
      <div className="absolute inset-0 z-50 bg-background flex flex-col overflow-hidden select-none animate-in fade-in duration-150">
        <ZenCompanionHeader
          mode="maximized"
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          centerView={centerView}
          onSwapCenter={onSwapCenter}
          onReset={onReset || onResetSplit || resetToDefault}
          onToggleFloat={onToggleFloat || onToggleSplit}
          onMinimize={onMinimize || (() => { onRestore?.(); setPipMinimized(true); })}
          onRestore={onRestore}
          onClose={onClose || onRestore}
          hasCriticalFinding={!!report?.criticalFinding}
        />
        <ZenCompanionBody {...commonBodyProps} />
      </div>
    );
  }

  // Docked in Right Column (or Split View)
  if (activeMode === 'docked') {
    return (
      <div className="relative w-full h-full flex flex-col bg-card overflow-hidden select-none">
        <ZenCompanionHeader
          mode="docked"
          docked={true}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          centerView={centerView}
          onSwapCenter={onSwapCenter}
          onReset={onReset || onResetSplit}
          onToggleFloat={onToggleFloat || onToggleSplit}
          onMaximize={onMaximize}
          onMinimize={onMinimize}
          onClose={onClose}
          hasCriticalFinding={!!report?.criticalFinding}
        />
        <ZenCompanionBody {...commonBodyProps} />
      </div>
    );
  }

  // Floating PiP Mode (Draggable & Resizable Window)
  return (
    <div
      style={{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }}
      className={cn(
        'fixed z-50 bg-card rounded-2xl border border-primary/50 shadow-2xl shadow-black/50 flex flex-col overflow-visible select-none',
        isDragging && 'shadow-primary/30 ring-2 ring-primary/60 opacity-95 cursor-grabbing',
        isResizing && 'ring-1 ring-primary/60'
      )}
    >
      <ZenCompanionHeader
        mode="floating"
        docked={false}
        activeTab={activeTab}
        onSelectTab={(tab) => { onSelectTab(tab); setPipMinimized(false); }}
        centerView={centerView}
        onSwapCenter={onSwapCenter}
        onDragMouseDown={handleDragMouseDown}
        onDoubleClickHeader={resetToDefault}
        onReset={resetToDefault}
        onToggleFloat={onToggleFloat || onToggleSplit}
        onMaximize={onMaximize}
        onMinimize={onMinimize || (() => setPipMinimized(true))}
        onClose={onClose || (() => setPipMinimized(true))}
        hasCriticalFinding={!!report?.criticalFinding}
      />
      <ZenCompanionBody {...commonBodyProps} isDragging={isDragging} isResizing={isResizing} />
      <StitchPipResizeHandles onResizeStart={handleResizeMouseDown} isResizing={isResizing} />
      {(isDragging || isResizing) && (
        <div className="fixed inset-0 z-[99998] cursor-move select-none bg-transparent" />
      )}
    </div>
  );
}
