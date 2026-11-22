'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useThreeColumnLayout } from '@/hooks/use-three-column-layout';
import { ZenColumnDivider } from './zen-column-divider';
import { ZenReportCanvas } from './zen-report-canvas';
import { ZenDicomViewportContainer } from './zen-dicom-viewport-container';
import { ZenCompanionPanel } from './zen-companion-panel';
import { ZenCompanionSlimRail } from './zen-companion-slim-rail';
import { ZenCompanionPipFab } from './zen-companion-pip-fab';
import { ZenMobileTabs, ZenMobileView } from './zen-mobile-tabs';
import { CompanionTab, CompanionWindowMode } from '@/services/companion-tab.service';
import { ZenThreeColumnReportingStageProps } from './zen-three-column-stage.types';

export function ZenThreeColumnReportingStage({
  study, patient, pgrName = '', onPgrNameChange, consultantName = '', onConsultantNameChange,
  report, setReport, modality = 'CT', isLocalCase = false, localCaseId, localSeries = [],
  seriesList = [], activeSeriesIndex = 0, onSelectSeries, reportingMode, onSelectReportingMode,
  onOpenCommandPalette, onStructure, structuring, onSave, syncStatus, savedTime, invert = false,
  onSendToHmis, sendingHmis, onSubmitToHmis, submittingHmis, isFinalSubmitAllowed,
  onRevertHmis, revertingHmis, hmisNotice, isTakenUpByMe, isClaimedByOther, claimedByName,
  onClaimCase, claimingCase, onEditPatient, currentVersion, onVersionChange,
  centerView: propCenterView, onToggleCenterView: propToggleCenterView,
  isRightCompanionOpen: propIsRightOpen, onToggleRightCompanion: propToggleRight,
  isStageMaximized: propIsMaximized, onToggleStageMaximize: propToggleMax,
  rightColTab: propRightTab, onSelectRightColTab: propSetRightTab,
}: ZenThreeColumnReportingStageProps) {
  const {
    rightColWidth, setRightColWidth, isRightCollapsed,
    setIsRightCollapsed, toggleRightCollapsed,
    rightColTab: hookRightColTab, setRightColTab: hookSetRightColTab,
    centerView: hookCenterView, toggleCenterView: hookToggleCenterView,
    isStageMaximized: hookIsMaximized, toggleStageMaximize: hookToggleMax,
    isDraggingDivider, startRightResize,
  } = useThreeColumnLayout();

  const centerView = propCenterView ?? hookCenterView;
  const toggleCenter = propToggleCenterView ?? hookToggleCenterView;
  const isRightOpen = propIsRightOpen !== undefined ? propIsRightOpen : !isRightCollapsed;
  const toggleRight = propToggleRight ?? toggleRightCollapsed;
  const isMaximized = propIsMaximized !== undefined ? propIsMaximized : hookIsMaximized;
  const toggleMax = propToggleMax ?? hookToggleMax;
  const rightColTab = propRightTab ?? hookRightColTab;
  const setRightColTab = propSetRightTab ?? hookSetRightColTab;

  const [companionMode, setCompanionMode] = useState<CompanionWindowMode>('docked');
  const [lastModeBeforeMax, setLastModeBeforeMax] = useState<CompanionWindowMode>('docked');
  const [mobileView, setMobileView] = useState<ZenMobileView>('report');

  const handleInsertText = useCallback(
    (text: string, target: 'findings' | 'impression') => {
      setReport((prev) => {
        const current = prev[target] || '';
        const addition = `<p>${text}</p>`;
        return { ...prev, [target]: current ? `${current} ${addition}` : addition };
      });
    },
    [setReport]
  );

  const handleOpenCompanionTab = useCallback(
    (tab: CompanionTab) => {
      setRightColTab(tab);
      if (!isRightOpen) toggleRight();
      if (companionMode === 'minimized') setCompanionMode('docked');
      setMobileView(tab === 'images' ? 'images' : 'copilot');
    },
    [setRightColTab, isRightOpen, toggleRight, companionMode]
  );

  const activeSeries = seriesList[activeSeriesIndex];

  const companionProps = {
    activeTab: rightColTab, onSelectTab: setRightColTab, centerView, onSwapCenter: toggleCenter,
    accessionNumber: study?.accessionNumber, patientName: patient?.fullName || study?.patientName,
    patientAge: patient?.age || study?.age, patientGender: patient?.gender || study?.gender,
    patientMrn: patient?.mrNumber || patient?.mrn || study?.patientMrn || study?.patientId,
    studyDescription: study?.studyDescription, pgrName, modality, isLocalCase, localCaseId,
    localSeries, seriesList, activeSeriesIndex, onSelectSeries, seriesName: activeSeries?.seriesDescription,
    report, setReport, studyId: study?.id, reportId: (report as any)?.id,
    onSaveReport: onSave, syncStatus, savedTime,
    findings: report.findings, impression: report.impression,
    clinicalHistory: report.clinicalHistory, patientClinicalNotes: patient?.clinicalNotes,
    initialContentJson: report.contentJson,
    onUpdateContentJson: (json: any) => setReport((prev) => ({ ...prev, contentJson: json })),
    onInsertImpression: (txt: string) => handleInsertText(txt, 'impression'),
    onSendToHmis, sendingHmis, onRevertHmis, revertingHmis, hmisNotice,
    isTakenUpByMe, isClaimedByOther, claimedByName, onClaimCase, claimingCase,
    currentVersion, onVersionChange,
  };

  return (
    <div className={`flex-1 relative flex h-full bg-surface-container-lowest overflow-hidden ${isMaximized ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Center Stage: Clinical Report Canvas OR Unified DICOM Viewport */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative">
        {centerView === 'images' ? (
          <ZenDicomViewportContainer
            accessionNumber={study?.accessionNumber}
            modality={modality}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            localSeries={localSeries}
            seriesList={seriesList}
            activeSeriesIndex={activeSeriesIndex}
            onSelectSeries={onSelectSeries}
            onSwapCenter={toggleCenter}
            isCompanion={false}
          />
        ) : (
          <div className={`flex-1 min-w-0 h-full flex flex-col overflow-hidden ${mobileView !== 'report' ? 'hidden md:flex' : 'flex'}`}>
            <ZenReportCanvas
              report={report} setReport={setReport} studyId={study.id} modality={modality}
              patientName={patient?.fullName || study?.patientName} patientAge={patient?.age || study?.age}
              patientGender={patient?.gender || study?.gender} patientMrn={patient?.mrNumber || patient?.mrn || study?.patientMrn || study?.patientId}
              accessionNumber={study?.accessionNumber} studyDescription={study?.studyDescription}
              pgrName={pgrName} onPgrNameChange={onPgrNameChange}
              consultantName={consultantName} onConsultantNameChange={onConsultantNameChange}
              reportingMode={reportingMode} scrollMode="unified"
              onSelectReportingMode={onSelectReportingMode} onOpenCommandPalette={onOpenCommandPalette}
              onStructure={onStructure} structuring={structuring}
              onMaximizeNotion={() => onSelectReportingMode('split')} onMinimizeToFab={() => onSelectReportingMode('fab')}
              onPopOutModal={() => onSelectReportingMode('modal')} onSave={onSave} syncStatus={syncStatus} savedTime={savedTime}
              onSendToHmis={onSendToHmis} sendingHmis={sendingHmis} onSubmitToHmis={onSubmitToHmis} submittingHmis={submittingHmis}
              isFinalSubmitAllowed={isFinalSubmitAllowed} onRevertHmis={onRevertHmis} revertingHmis={revertingHmis}
              hmisNotice={hmisNotice} isTakenUpByMe={isTakenUpByMe} isClaimedByOther={isClaimedByOther} claimedByName={claimedByName}
              onClaimCase={onClaimCase} claimingCase={claimingCase} isCompanionOpen={companionMode === 'docked' && isRightOpen}
              onToggleCompanion={() => { if (companionMode !== 'docked') setCompanionMode('docked'); toggleRight(); }}
              onOpenCompanionTab={handleOpenCompanionTab} onOpenInsights={() => handleOpenCompanionTab('insights_ddx')}
              onEditPatient={onEditPatient} currentVersion={currentVersion} onVersionChange={onVersionChange}
            />
          </div>
        )}
      </div>

      {/* Column 3 (Right): Unified Companion (Docked Mode) */}
      {!isMaximized && companionMode === 'docked' && (
        <>
          {isRightOpen && (
            <div className="hidden md:flex h-full">
              <ZenColumnDivider
                onMouseDown={startRightResize}
                isDragging={isDraggingDivider === 'right'}
                title="Drag to resize Companion Rail"
              />
            </div>
          )}
          <div className="hidden md:flex h-full">
            {!isRightOpen ? (
              <ZenCompanionSlimRail
                activeTab={rightColTab}
                onSelectTab={setRightColTab}
                onExpand={toggleRight}
                onToggleFloat={() => { setCompanionMode('floating'); if (!isRightOpen) toggleRight(); }}
              />
            ) : (
              <div
                style={{ width: `${rightColWidth}px` }}
                className="h-full flex flex-col shrink-0 select-none overflow-hidden relative border-l border-outline-variant/50"
              >
                <ZenCompanionPanel
                  {...companionProps}
                  mode="docked"
                  docked={true}
                  isOpen={true}
                  onToggleFloat={() => setCompanionMode('floating')}
                  onMaximize={() => { setLastModeBeforeMax('docked'); setCompanionMode('maximized'); }}
                  onMinimize={() => setCompanionMode('minimized')}
                  onClose={toggleRight}
                  onReset={() => setRightColWidth(340)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Mode: Draggable PiP Window */}
      {companionMode === 'floating' && (
        <ZenCompanionPanel
          {...companionProps}
          mode="floating" docked={false} isOpen={true}
          onToggleFloat={() => setCompanionMode('docked')}
          onMaximize={() => { setLastModeBeforeMax('floating'); setCompanionMode('maximized'); }}
          onMinimize={() => setCompanionMode('minimized')}
          onClose={() => setCompanionMode('docked')}
        />
      )}

      {/* Maximized Mode: Full Stage Overlay */}
      {companionMode === 'maximized' && (
        <ZenCompanionPanel
          {...companionProps}
          mode="maximized" isOpen={true}
          onToggleFloat={() => setCompanionMode('floating')}
          onMaximize={() => setCompanionMode(lastModeBeforeMax)}
          onRestore={() => setCompanionMode(lastModeBeforeMax)}
          onMinimize={() => setCompanionMode('minimized')}
          onClose={() => setCompanionMode(lastModeBeforeMax)}
          onReset={() => setRightColWidth(340)}
        />
      )}

      {/* Minimized Mode: FAB */}
      {companionMode === 'minimized' && (
        <ZenCompanionPipFab
          onRestore={() => { setCompanionMode(lastModeBeforeMax || 'docked'); if (!isRightOpen) toggleRight(); }}
          onPopout={() => setCompanionMode('floating')}
          activeTab={rightColTab}
          seriesName={activeSeries?.seriesDescription}
          activeSeriesIndex={activeSeriesIndex}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <ZenMobileTabs
        activeView={mobileView}
        onSelectView={(v) => {
          setMobileView(v);
          if (v === 'images') handleOpenCompanionTab('images');
          else if (v === 'copilot') handleOpenCompanionTab('insights_ddx');
        }}
        seriesName={activeSeries?.seriesDescription}
        hasCriticalFinding={!!report.criticalFinding}
      />

      {isDraggingDivider !== null && (
        <div className="fixed inset-0 z-[99999] cursor-col-resize select-none bg-transparent" />
      )}
    </div>
  );
}
