'use client';

import React, { useState, useCallback } from 'react';
import { useThreeColumnLayout } from '@/hooks/use-three-column-layout';
import { ZenSeriesColumn } from './zen-series-column';
import { ZenSimilarCasesColumn } from './zen-similar-cases-column';
import { ZenColumnDivider } from './zen-column-divider';
import { ZenReportCanvas } from './zen-report-canvas';
import { ZenCompanionPanel } from './zen-companion-panel';
import { ZenMobileTabs, ZenMobileView } from './zen-mobile-tabs';
import { StitchSeriesItem } from './stitch-filmstrip';
import { ReportingMode } from '@/hooks/use-reporting-layout';
import { ReportEditorState, ReportSyncStatus } from '@/hooks/use-report-editor-actions';
import { useCompanionPanel, CompanionTab } from '@/hooks/use-companion-panel';

interface ZenThreeColumnReportingStageProps {
  study: any;
  patient?: any;
  pgrName?: string;
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  modality?: string;
  isLocalCase?: boolean;
  localCaseId?: string;
  localSeries?: any[];
  seriesList: StitchSeriesItem[];
  activeSeriesIndex: number;
  onSelectSeries: (idx: number) => void;
  reportingMode: ReportingMode;
  onSelectReportingMode: (mode: ReportingMode) => void;
  onOpenCommandPalette: () => void;
  onStructure: () => void;
  structuring: boolean;
  onSave: () => void;
  syncStatus?: ReportSyncStatus;
  savedTime?: string | null;
  invert?: boolean;
  onSendToHmis?: (options?: { deepVerify?: boolean }) => void;
  sendingHmis?: boolean;
  onSubmitToHmis?: (options?: { deepVerify?: boolean }) => void;
  submittingHmis?: boolean;
  isFinalSubmitAllowed?: boolean;
  onRevertHmis?: () => void;
  revertingHmis?: boolean;
  hmisNotice?: string | null;
  isTakenUpByMe?: boolean;
  isClaimedByOther?: boolean;
  claimedByName?: string;
  onClaimCase?: () => void;
  claimingCase?: boolean;
  onEditPatient?: () => void;
  onPgrNameChange?: (name: string) => void;
  consultantName?: string;
  onConsultantNameChange?: (name: string) => void;
  currentVersion?: number;
  onVersionChange?: (version: number) => void;
}

export function ZenThreeColumnReportingStage({
  study,
  patient,
  pgrName = '',
  onPgrNameChange,
  consultantName = '',
  onConsultantNameChange,
  report,
  setReport,
  modality = 'CT',
  isLocalCase = false,
  localCaseId,
  localSeries = [],
  seriesList = [],
  activeSeriesIndex = 0,
  onSelectSeries,
  reportingMode,
  onSelectReportingMode,
  onOpenCommandPalette,
  onStructure,
  structuring,
  onSave,
  syncStatus,
  savedTime,
  invert = false,
  onSendToHmis,
  sendingHmis,
  onSubmitToHmis,
  submittingHmis,
  isFinalSubmitAllowed,
  onRevertHmis,
  revertingHmis,
  hmisNotice,
  isTakenUpByMe,
  isClaimedByOther,
  claimedByName,
  onClaimCase,
  claimingCase,
  onEditPatient,
  currentVersion,
  onVersionChange,
}: ZenThreeColumnReportingStageProps) {
  const {
    leftColWidth,
    isLeftCollapsed,
    toggleLeftCollapsed,
    rightColWidth,
    isRightCollapsed,
    toggleRightCollapsed,
    rightColTab,
    setRightColTab,
    openRightColTab,
    isDraggingDivider,
    startLeftResize,
    startRightResize,
  } = useThreeColumnLayout();

  const {
    isOpen: isCompanionOpen,
    activeTab: companionTab,
    setActiveTab: setCompanionTab,
    openCompanion,
    closeCompanion,
    toggleCompanion,
  } = useCompanionPanel('images');

  const [mobileView, setMobileView] = useState<ZenMobileView>('report');

  const handleInsertText = useCallback(
    (text: string, target: 'findings' | 'impression') => {
      setReport((prev) => {
        const current = prev[target] || '';
        const addition = `<p>${text}</p>`;
        return {
          ...prev,
          [target]: current ? `${current} ${addition}` : addition,
        };
      });
    },
    [setReport]
  );

  const handleOpenCompanionTab = useCallback(
    (tab: CompanionTab) => {
      openCompanion(tab);
      if (tab === 'images') {
        setMobileView('images');
      } else {
        setMobileView('copilot');
      }
    },
    [openCompanion]
  );

  const handleSelectMobileView = useCallback(
    (view: ZenMobileView) => {
      setMobileView(view);
      if (view === 'images') {
        openCompanion('images');
      } else if (view === 'copilot') {
        openCompanion('ddx');
      }
    },
    [openCompanion]
  );

  const activeSeries = seriesList[activeSeriesIndex];

  return (
    <div className="flex-1 relative flex h-full bg-surface-container-lowest overflow-hidden">
      {/* Column 1 (Left): RadiAnt / Vitrea Style Series Rail (Desktop) */}
      {seriesList.length > 0 && (
        <>
          <div className="hidden md:flex h-full">
            <ZenSeriesColumn
              seriesList={seriesList}
              activeSeriesIndex={activeSeriesIndex}
              onSelectSeries={onSelectSeries}
              isCollapsed={isLeftCollapsed}
              onToggleCollapse={toggleLeftCollapsed}
              width={leftColWidth}
              modality={modality}
              isLocalCase={isLocalCase}
              localCaseId={localCaseId}
              invert={invert}
            />
          </div>

          {/* Left Divider Resizer (Desktop) */}
          {!isLeftCollapsed && (
            <div className="hidden md:flex h-full">
              <ZenColumnDivider
                onMouseDown={startLeftResize}
                isDragging={isDraggingDivider === 'left'}
                title="Drag to resize Series Rail"
              />
            </div>
          )}
        </>
      )}

      {/* Column 2 (Center): Clinical Report Canvas & Mobile Responsive View */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative">
        <div
          className={`flex-1 min-w-0 h-full flex flex-col overflow-hidden ${
            mobileView !== 'report' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ZenReportCanvas
            report={report}
            setReport={setReport}
            studyId={study.id}
            modality={modality}
            patientName={patient?.fullName || study?.patientName}
            patientAge={patient?.age || study?.age}
            patientGender={patient?.gender || study?.gender}
            patientMrn={patient?.mrNumber || patient?.mrn || study?.patientMrn || study?.patientId}
            accessionNumber={study?.accessionNumber}
            studyDescription={study?.studyDescription}
            pgrName={pgrName}
            onPgrNameChange={onPgrNameChange}
            consultantName={consultantName}
            onConsultantNameChange={onConsultantNameChange}
            reportingMode={reportingMode}
            scrollMode="unified"
            onSelectReportingMode={onSelectReportingMode}
            onOpenCommandPalette={onOpenCommandPalette}
            onStructure={onStructure}
            structuring={structuring}
            onMaximizeNotion={() => onSelectReportingMode('split')}
            onMinimizeToFab={() => onSelectReportingMode('fab')}
            onPopOutModal={() => onSelectReportingMode('modal')}
            onSave={onSave}
            syncStatus={syncStatus}
            savedTime={savedTime}
            onSendToHmis={onSendToHmis}
            sendingHmis={sendingHmis}
            onSubmitToHmis={onSubmitToHmis}
            submittingHmis={submittingHmis}
            isFinalSubmitAllowed={isFinalSubmitAllowed}
            onRevertHmis={onRevertHmis}
            revertingHmis={revertingHmis}
            hmisNotice={hmisNotice}
            isTakenUpByMe={isTakenUpByMe}
            isClaimedByOther={isClaimedByOther}
            claimedByName={claimedByName}
            onClaimCase={onClaimCase}
            claimingCase={claimingCase}
            isCompanionOpen={isCompanionOpen}
            onToggleCompanion={toggleCompanion}
            onOpenCompanionTab={handleOpenCompanionTab}
            onOpenInsights={() => openRightColTab('insights')}
            onEditPatient={onEditPatient}
            currentVersion={currentVersion}
            onVersionChange={onVersionChange}
          />
        </div>
      </div>

      {/* Right Divider Resizer (Desktop) */}
      {!isRightCollapsed && (
        <div className="hidden md:flex h-full">
          <ZenColumnDivider
            onMouseDown={startRightResize}
            isDragging={isDraggingDivider === 'right'}
            title="Drag to resize Similar Cases Rail"
          />
        </div>
      )}

      {/* Column 3 (Right): Case Insights, Radiopaedia & Positive Findings Rail (Desktop) */}
      <div className="hidden md:flex h-full">
        <ZenSimilarCasesColumn
          modality={modality}
          isCollapsed={isRightCollapsed}
          onToggleCollapse={toggleRightCollapsed}
          width={rightColWidth}
          onInsertText={handleInsertText}
          isResizing={isDraggingDivider === 'right'}
          activeTab={rightColTab}
          onSelectTab={setRightColTab}
          onOpenTab={openRightColTab}
          findings={report.findings}
          impression={report.impression}
          clinicalHistory={report.clinicalHistory}
          studyDescription={study?.studyDescription}
          patientAge={patient?.age || study?.age}
          patientGender={patient?.gender || study?.gender}
          studyId={study?.id}
          reportId={(report as any)?.id}
          accessionNumber={study?.accessionNumber}
          contentJson={report.contentJson}
          patientClinicalNotes={patient?.clinicalNotes}
          onUpdateContentJson={(json) => setReport((prev) => ({ ...prev, contentJson: json }))}
          report={report}
          setReport={setReport}
          pgrName={pgrName}
          onSave={onSave}
          currentVersion={currentVersion}
        />
      </div>

      {/* Unified Draggable & Resizable Floating Companion Panel (Images + DDx + Chat + Guidance + Report) */}
      <ZenCompanionPanel
        docked={false}
        defaultMinimized={true}
        isOpen={isCompanionOpen}
        onClose={closeCompanion}
        activeTab={companionTab}
        onSelectTab={setCompanionTab}
        onToggleSplit={() => onSelectReportingMode('split')}
        onMaximize={() => onSelectReportingMode('full')}
        accessionNumber={study.accessionNumber}
        modality={modality}
        isLocalCase={isLocalCase}
        localCaseId={localCaseId}
        localSeries={localSeries}
        activeSeriesIndex={activeSeriesIndex}
        onSelectSeries={onSelectSeries}
        seriesName={activeSeries?.seriesDescription}
        report={report}
        setReport={setReport}
        studyId={study.id}
        onSaveReport={onSave}
        syncStatus={syncStatus}
        savedTime={savedTime}
        findings={report.findings}
        impression={report.impression}
        clinicalHistory={report.clinicalHistory}
        onInsertImpression={(txt) => handleInsertText(txt, 'impression')}
        currentVersion={currentVersion}
        onVersionChange={onVersionChange}
      />

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <ZenMobileTabs
        activeView={mobileView}
        onSelectView={handleSelectMobileView}
        seriesName={activeSeries?.seriesDescription}
        hasCriticalFinding={!!report.criticalFinding}
      />

      {/* Global pointer capture shield during column divider drag */}
      {isDraggingDivider !== null && (
        <div className="fixed inset-0 z-[99999] cursor-col-resize select-none bg-transparent" />
      )}
    </div>
  );
}
