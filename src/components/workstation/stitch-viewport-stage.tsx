'use client';

import React, { useRef } from 'react';
import { ReportingMode } from '@/hooks/use-reporting-layout';
import { ZenLeftPaneColumn } from './zen-left-pane-column';
import { ZenThreeColumnReportingStage } from './zen-three-column-reporting-stage';
import { ZenSplitResizer } from './zen-split-resizer';
import { ZenReportingFab } from './zen-reporting-fab';
import { ZenCompanionPanel } from './zen-companion-panel';
import { useCompanionPanel } from '@/hooks/use-companion-panel';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { StitchSeriesItem } from './stitch-filmstrip';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { ReportEditorState, ReportSyncStatus } from '@/hooks/use-report-editor-actions';
import type { WorkstationCenterView } from '@/hooks/use-three-column-layout';
import type { CompanionTab } from '@/services/companion-tab.service';

interface StitchViewportStageProps {
  reportingMode: ReportingMode; onSelectReportingMode: (mode: ReportingMode) => void;
  splitPercent: number; onSplitChange: (percent: number) => void; onResetSplit: () => void;
  isDraggingSplit: boolean; setIsDraggingSplit: (val: boolean) => void;
  study: any; patient?: any; pgrName?: string; onPgrNameChange?: (name: string) => void;
  consultantName?: string; onConsultantNameChange?: (name: string) => void;
  isLocalCase: boolean; localCaseId?: string; localSeries?: any[];
  seriesList: StitchSeriesItem[]; activeSeriesIndex: number; seriesSelectToken?: number;
  onSelectSeries: (idx: number) => void; onActiveSeriesChange?: (seriesIndex: number) => void;
  paneSeriesMap: Record<number, number>; onUpdatePaneSeries: (paneIdx: number, seriesIdx: number) => void;
  tool: DicomTool; onSelectTool: (tool: DicomTool) => void; preset: string; onSelectPreset: (preset: string) => void;
  isCinePlaying: boolean; onToggleCine: () => void; syncScroll?: boolean; onToggleSyncScroll: () => void;
  scoutLinesActive?: boolean; onToggleScoutLines?: () => void; onInvert: () => void; onReset: () => void;
  cadActive?: boolean; onToggleCad?: () => void; onExport: () => void;
  invert?: boolean; resetKey?: number; gridRows?: number; gridCols?: number; onSelectGrid?: (rows: number, cols: number) => void;
  is3DActive?: boolean; onToggle3D?: () => void;
  report: ReportEditorState; setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  onOpenCommandPalette: () => void; onStructure: () => void; structuring: boolean; onSave: () => void;
  syncStatus?: ReportSyncStatus; savedTime?: string | null; hasStudy?: boolean;
  onOpenPacsSearch?: () => void; onOpenFolderImport?: () => void; recentCases?: any[]; onStartBlankReport?: () => void;
  currentUser?: any; onSendToHmis?: (options?: { deepVerify?: boolean }) => void; sendingHmis?: boolean;
  onSubmitToHmis?: (options?: { deepVerify?: boolean }) => void; submittingHmis?: boolean; isFinalSubmitAllowed?: boolean;
  onRevertHmis?: () => void; revertingHmis?: boolean; hmisNotice?: string | null;
  onSyncGoogleDoc?: () => void; syncingGoogleDoc?: boolean; googleDocUrl?: string | null;
  onUploadGoogleDrive?: () => void; uploadingGoogleDrive?: boolean; onEditPatient?: () => void;
  isTakenUpByMe?: boolean; isClaimedByOther?: boolean; claimedByName?: string;
  onClaimCase?: () => void; claimingCase?: boolean; currentVersion?: number; onVersionChange?: (version: number) => void;
  centerView?: WorkstationCenterView; onToggleCenterView?: () => void;
  isRightCompanionOpen?: boolean; onToggleRightCompanion?: () => void;
  isStageMaximized?: boolean; onToggleStageMaximize?: () => void;
  rightColTab?: CompanionTab; onSelectRightColTab?: (tab: CompanionTab) => void;
}

export function StitchViewportStage(props: StitchViewportStageProps) {
  const {
    reportingMode,
    onSelectReportingMode,
    splitPercent,
    onSplitChange,
    onResetSplit,
    isDraggingSplit,
    setIsDraggingSplit,
    study,
    isLocalCase,
    localCaseId,
    localSeries,
    report,
    setReport,
    onOpenCommandPalette,
    onStructure,
    structuring,
    onSave,
    syncStatus,
    savedTime,
  } = props;

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const { activeTab: companionTab, setActiveTab: setCompanionTab } = useCompanionPanel('report');
  const isMobile = useIsMobile();

  const handleInsertImpression = (text: string) => {
    setReport((prev) => {
      const curr = prev.impression || '';
      const addition = `<p>${text}</p>`;
      return { ...prev, impression: curr ? `${curr} ${addition}` : addition };
    });
  };

  const activeSeries = props.seriesList[props.activeSeriesIndex];

  const renderCompanionPanel = (docked: boolean) => (
    <ZenCompanionPanel
      docked={docked}
      isOpen={true}
      activeTab={companionTab}
      onSelectTab={setCompanionTab}
      onToggleSplit={() => onSelectReportingMode(docked ? 'modal' : 'split')}
      onMaximize={() => onSelectReportingMode('full')}
      onResetSplit={docked ? onResetSplit : undefined}
      onClose={() => onSelectReportingMode('fab')}
      accessionNumber={study?.accessionNumber || ''}
      patientName={props.patient?.fullName || study?.patientName}
      patientAge={props.patient?.age || study?.age}
      patientGender={props.patient?.gender || study?.gender}
      patientMrn={props.patient?.mrNumber || props.patient?.mrn || study?.patientMrn || study?.patientId}
      studyDescription={study?.studyDescription || study?.scanType}
      pgrName={props.pgrName || ''}
      modality={study?.modality || 'CT'}
      isLocalCase={isLocalCase}
      localCaseId={localCaseId}
      localSeries={localSeries}
      activeSeriesIndex={props.activeSeriesIndex}
      onSelectSeries={props.onSelectSeries}
      seriesName={activeSeries?.seriesDescription}
      report={report}
      setReport={setReport}
      studyId={study?.id || ''}
      onSaveReport={onSave}
      syncStatus={syncStatus}
      savedTime={savedTime}
      findings={report.findings}
      impression={report.impression}
      clinicalHistory={report.clinicalHistory}
      onInsertImpression={handleInsertImpression}
      onSendToHmis={props.onSendToHmis}
      sendingHmis={props.sendingHmis}
      onRevertHmis={props.onRevertHmis}
      revertingHmis={props.revertingHmis}
      hmisNotice={props.hmisNotice}
      onSyncGoogleDoc={props.onSyncGoogleDoc}
      syncingGoogleDoc={props.syncingGoogleDoc}
      googleDocUrl={props.googleDocUrl}
      isTakenUpByMe={props.isTakenUpByMe}
      isClaimedByOther={props.isClaimedByOther}
      claimedByName={props.claimedByName}
      onClaimCase={props.onClaimCase}
      claimingCase={props.claimingCase}
      currentVersion={props.currentVersion}
      onVersionChange={props.onVersionChange}
    />
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      <div
        ref={stageContainerRef}
        className={`flex-1 flex min-h-0 overflow-hidden relative select-none ${
          isDraggingSplit ? 'cursor-col-resize select-none pointer-events-none' : ''
        }`}
      >
        {/* Mode 4: Full Clinical Studio View (3-Column Layout: Series Rail + Centered Canvas + Similar Cases + PiP) */}
        {reportingMode === 'full' && (
          <ZenThreeColumnReportingStage
            study={study}
            patient={props.patient}
            pgrName={props.pgrName}
            onPgrNameChange={props.onPgrNameChange}
            consultantName={props.consultantName}
            onConsultantNameChange={props.onConsultantNameChange}
            report={report}
            setReport={setReport}
            modality={study?.modality || 'CT'}
            isLocalCase={isLocalCase}
            localCaseId={localCaseId}
            localSeries={localSeries}
            seriesList={props.seriesList}
            activeSeriesIndex={props.activeSeriesIndex}
            onSelectSeries={props.onSelectSeries}
            reportingMode={reportingMode}
            onSelectReportingMode={onSelectReportingMode}
            onOpenCommandPalette={onOpenCommandPalette}
            onStructure={onStructure}
            structuring={structuring}
            onSave={onSave}
            syncStatus={syncStatus}
            savedTime={savedTime}
            invert={props.invert}
            onSendToHmis={props.onSendToHmis}
            sendingHmis={props.sendingHmis}
            onSubmitToHmis={props.onSubmitToHmis}
            submittingHmis={props.submittingHmis}
            isFinalSubmitAllowed={props.isFinalSubmitAllowed}
            onRevertHmis={props.onRevertHmis}
            revertingHmis={props.revertingHmis}
            hmisNotice={props.hmisNotice}
            isTakenUpByMe={props.isTakenUpByMe}
            isClaimedByOther={props.isClaimedByOther}
            claimedByName={props.claimedByName}
            onClaimCase={props.onClaimCase}
            claimingCase={props.claimingCase}
            onEditPatient={props.onEditPatient}
            currentVersion={props.currentVersion}
            onVersionChange={props.onVersionChange}
            centerView={props.centerView}
            onToggleCenterView={props.onToggleCenterView}
            isRightCompanionOpen={props.isRightCompanionOpen}
            onToggleRightCompanion={props.onToggleRightCompanion}
            isStageMaximized={props.isStageMaximized}
            onToggleStageMaximize={props.onToggleStageMaximize}
            rightColTab={props.rightColTab}
            onSelectRightColTab={props.onSelectRightColTab}
          />
        )}

        {/* Mode 2: Split View (Side-by-side on desktop; full viewport with FAB on mobile) */}
        {reportingMode === 'split' && (
          isMobile ? (
            <div className="w-full h-full min-w-0 flex flex-col overflow-hidden relative">
              <ZenLeftPaneColumn {...props} />
              <ZenReportingFab
                onSelectMode={onSelectReportingMode}
                onTranscript={(transcript) => {
                  setReport((p) => ({ ...p, findings: p.findings ? `${p.findings} ${transcript}` : transcript }));
                }}
                status={report.status}
              />
            </div>
          ) : (
            <>
              <div style={{ width: `${splitPercent}%` }} className="h-full min-w-0 flex flex-col overflow-hidden">
                <ZenLeftPaneColumn {...props} />
              </div>
              <ZenSplitResizer
                splitPercent={splitPercent}
                onSplitChange={onSplitChange}
                onResetSplit={onResetSplit}
                containerRef={stageContainerRef}
                isDragging={isDraggingSplit}
                setIsDragging={setIsDraggingSplit}
              />
              <div style={{ width: `${100 - splitPercent}%` }} className="h-full min-w-0 flex flex-col border-l border-outline-variant/60">
                {renderCompanionPanel(true)}
              </div>
            </>
          )
        )}

        {/* Mode 1 (FAB) and Mode 3 (Floating View / PiP): 100% Viewport Column */}
        {(reportingMode === 'fab' || reportingMode === 'modal') && (
          <div className="w-full h-full min-w-0 flex flex-col overflow-hidden relative">
            <ZenLeftPaneColumn {...props} />

            {reportingMode === 'fab' && (
              <ZenReportingFab
                onSelectMode={onSelectReportingMode}
                onTranscript={(transcript) => {
                  setReport((p) => ({ ...p, findings: p.findings ? `${p.findings} ${transcript}` : transcript }));
                }}
                status={report.status}
              />
            )}

            {reportingMode === 'modal' && renderCompanionPanel(false)}
          </div>
        )}
      </div>
    </div>
  );
}
