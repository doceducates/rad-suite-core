'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { StitchHeader } from './stitch-header';
import { StitchViewportStage } from './stitch-viewport-stage';
import { useReportEditorActions, ReportEditorState } from '@/hooks/use-report-editor-actions';
import { useReportingLayout } from '@/hooks/use-reporting-layout';
import { useThreeColumnLayout } from '@/hooks/use-three-column-layout';
import { useWorkstationStudyClaim } from '@/hooks/use-workstation-study-claim';
import { CrossSectionalTemplate, HmisNormalTemplate } from '@/types/templates';
import { DicomTool } from '@/components/dicom/dicom-toolbar';
import { useWorkstationShortcuts } from '@/hooks/use-workstation-shortcuts';
import { buildSeriesList, buildReportState } from './workstation-constants';
import { findingsListToHtml } from '@/lib/clinical-format';
import { config } from '@/lib/config';
import { isSectionFilled } from './report-section-dots';
import { isSameRadiologistUser } from '@/services/unified-case-filters';
import { useClinicianAttribution } from '@/hooks/use-clinician-attribution';
import { useCaseLoadingProgress } from '@/hooks/use-case-loading-progress';
import { usePacsStudyRetrieval } from '@/hooks/use-pacs-study-retrieval';
import { DicomDragDropZone } from './dicom-drag-drop-zone';
import { ZenWorkstationModals } from './zen-workstation-modals';
import { WorkstationFooter } from '@/components/layout/workstation-footer';

interface ZenWorkstationProps {
  study?: any; patient?: any; initialReport?: any;
  isLocalCase?: boolean; localCaseId?: string; localSeries?: any[];
  recentCases?: any[]; currentUser?: any; initialMode?: 'review' | 'report';
}

const EMPTY_SERIES: any[] = [];
const EMPTY_CASES: any[] = [];
const DEFAULT_STUDY = { id: '', accessionNumber: '', modality: 'CT', studyDescription: 'Standalone Workstation', clinicalHistory: '' };
const DEFAULT_PATIENT = { id: '', fullName: 'No Study Loaded', mrNumber: '', age: '', gender: '' };

export function ZenWorkstation({
  study, patient, initialReport, isLocalCase = false, localCaseId,
  localSeries = EMPTY_SERIES, recentCases = EMPTY_CASES, currentUser, initialMode,
}: ZenWorkstationProps) {
  const hasStudy = Boolean(study?.accessionNumber || (isLocalCase && localCaseId));
  const activeStudy = study || DEFAULT_STUDY;
  const activePatient = patient || (hasStudy ? { ...DEFAULT_PATIENT, fullName: 'Unknown Patient' } : DEFAULT_PATIENT);

  const [currentStudy, setCurrentStudy] = useState(activeStudy);
  const [currentPatient, setCurrentPatient] = useState(activePatient);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFolderImportOpen, setIsFolderImportOpen] = useState(false);
  const [currentLocalSeries, setCurrentLocalSeries] = useState<any[]>(localSeries);
  const [currentIsLocalCase, setCurrentIsLocalCase] = useState<boolean>(isLocalCase);
  const [currentLocalCaseId, setCurrentLocalCaseId] = useState<string>(localCaseId || activeStudy.accessionNumber || '');

  useEffect(() => {
    setCurrentLocalSeries((prev: any[]) => (prev === localSeries ? prev : localSeries));
    setCurrentIsLocalCase((prev: boolean) => (prev === isLocalCase ? prev : isLocalCase));
    const targetCaseId = localCaseId || activeStudy.accessionNumber || '';
    setCurrentLocalCaseId((prev: string) => (prev === targetCaseId ? prev : targetCaseId));
  }, [localSeries, isLocalCase, localCaseId, activeStudy.accessionNumber]);

  const handleSeriesLoaded = useCallback((newSeries: any[], caseId: string) => {
    setCurrentLocalSeries(newSeries);
    setCurrentIsLocalCase(true);
    setCurrentLocalCaseId(caseId);
  }, []);

  useCaseLoadingProgress(hasStudy ? (activeStudy.accessionNumber || localCaseId) : undefined, activeStudy.modality);

  const assignedRadiologistId = currentStudy?.assignedRadiologistId || activeStudy?.assignedRadiologistId;
  const isTakenUpByMe = isSameRadiologistUser(assignedRadiologistId, currentUser?.id);
  const isClaimedByOther = Boolean(assignedRadiologistId && currentUser?.id && !isTakenUpByMe);
  const claimedByName = currentStudy?.assignedRadiologistName || activeStudy?.assignedRadiologistName;

  // 4-Mode Reporting Layout state (FAB, Split, Modal, Full) with persistence across cases
  const { reportingMode, setReportingMode, splitPercent, setSplitPercent, resetSplit, isDragging, setIsDragging } = useReportingLayout();
  const threeCol = useThreeColumnLayout();

  const hasImages = Boolean(currentIsLocalCase || (currentLocalSeries && currentLocalSeries.length > 0));
  const isInitialMountRef = useRef(true);

  // Apply explicit URL mode (?mode=full | split | modal | fab | report | review)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      if (initialMode === 'report') setReportingMode('split');
      else if (initialMode === 'review') setReportingMode('fab');
      else if (initialMode && ['fab', 'split', 'modal', 'full'].includes(initialMode)) {
        setReportingMode(initialMode as any);
      }
    }
  }, [initialMode, setReportingMode]);

  // If a study has zero DICOM images and user is in view-only FAB mode, guide into full reporting
  useEffect(() => {
    if (hasStudy && !hasImages && reportingMode === 'fab') {
      setReportingMode('full');
    }
  }, [hasStudy, hasImages, reportingMode, setReportingMode]);

  const isReviewMode = reportingMode === 'fab';
  const handleToggleReviewMode = useCallback(() => {
    setReportingMode(reportingMode === 'fab' ? 'split' : 'fab');
  }, [reportingMode, setReportingMode]);

  const [activeSeriesIndex, setActiveSeriesIndex] = useState(0);
  const [seriesSelectToken, setSeriesSelectToken] = useState(0);
  const [paneSeriesMap, setPaneSeriesMap] = useState<Record<number, number>>({ 0: 0, 1: 1, 2: 2, 3: 3 });
  const [tool, setTool] = useState<DicomTool>('pan');
  const [preset, setPreset] = useState(activeStudy.modality === 'MR' || activeStudy.modality === 'MRI' ? 'mriT2' : 'soft');
  const [isCinePlaying, setIsCinePlaying] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const [scoutLinesActive, setScoutLinesActive] = useState(true);
  const [invert, setInvert] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [gridConfig, setGridConfig] = useState({ rows: 1, cols: 1 });
  const [cadActive, setCadActive] = useState(true);
  const [is3DActive, setIs3DActive] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isPacsSearchOpen, setIsPacsSearchOpen] = useState(false);
  const [pacsSearchInitialFilter, setPacsSearchInitialFilter] = useState<'all' | 'me'>('all');

  usePacsStudyRetrieval(activeStudy.accessionNumber, currentIsLocalCase, handleSeriesLoaded);

  const handleSelectSeries = useCallback((idx: number) => {
    setActiveSeriesIndex(idx);
    setSeriesSelectToken((t) => t + 1);
  }, []);

  const handleUpdatePaneSeries = useCallback((paneIdx: number, seriesIdx: number) => {
    setPaneSeriesMap((prev) => ({ ...prev, [paneIdx]: seriesIdx }));
  }, []);

  const handleSelectGrid = useCallback((rows: number, cols: number) => {
    setGridConfig({ rows, cols });
  }, []);

  useWorkstationShortcuts({
    isCommandOpen: isPacsSearchOpen, isNotionModalOpen: false,
    setTool, setInvert, setResetKey, setIsCinePlaying,
  });

  const [report, setReport] = useState<ReportEditorState>(() => buildReportState(initialReport, activeStudy));

  useEffect(() => {
    setCurrentStudy(activeStudy);
    setCurrentPatient(activePatient);
    setReport(buildReportState(initialReport, activeStudy));
    setActiveSeriesIndex(0);
  }, [activeStudy.id, activeStudy.accessionNumber, initialReport?.id]);

  const { consultantName, setConsultantName, pgrName, setPgrName } = useClinicianAttribution(currentUser);

  const {
    syncStatus, savedTime, structuring, sendingHmis, submittingHmis, revertingHmis,
    syncingGoogleDoc, googleDocUrl, handleStructureWithMedGemma,
    handleSave, handleSendToHmis, handleSubmitToHmis, handleRevertHmis, handleSyncGoogleDoc,
    currentVersion, setCurrentVersion,
  } = useReportEditorActions({
    report, setReport, studyId: currentStudy.id, modality: currentStudy.modality,
    initialReportId: initialReport?.id, initialGoogleDocUrl: initialReport?.googleDocUrl, study: currentStudy,
    patient: currentPatient, pgrName, consultantName, initialVersion: initialReport?.currentVersion,
    isTakenUpByMe, userRole: currentUser?.role,
  });

  const isHmisActive = Boolean(config.hmisGatewayUrl);

  const {
    claimingCase, releasingCase, uploadingToDrive,
    handleClaimCurrentStudy, handleReleaseCurrentStudy,
    handleUploadStudyToGoogleDrive,
    handleSendToHmisWithAutoClaim, handleSubmitToHmisWithAutoClaim,
  } = useWorkstationStudyClaim({
    currentStudy, setCurrentStudy, activeStudy, currentUser,
    isTakenUpByMe, isClaimedByOther, handleSendToHmis, handleSubmitToHmis,
  });

  const seriesList = hasStudy
    ? buildSeriesList(currentIsLocalCase, currentLocalSeries, activeStudy.modality, (activeStudy as any).studyDescription || (activeStudy as any).scanType || '')
    : [];

  const applyTemplate = useCallback((tpl: CrossSectionalTemplate | HmisNormalTemplate) => {
    setReport((p) => ({ ...p, technique: tpl.technique, findings: findingsListToHtml(tpl.normalFindings), impression: '<p>' + tpl.defaultImpression + '</p>' }));
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen h-[100dvh] bg-surface text-on-surface flex overflow-hidden select-none">
      <Sidebar userRole={currentUser?.role} userName={currentUser?.name} userTitle={currentUser?.title} allowedScreens={currentUser?.allowedScreens} />

      <DicomDragDropZone>
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <StitchHeader
            patientName={currentPatient.fullName} age={currentPatient.age || (hasStudy ? '26Y' : '')} gender={currentPatient.gender || (hasStudy ? 'M' : '')}
            modality={hasStudy ? currentStudy.modality : '—'} accessionNumber={currentStudy.accessionNumber}
            patientMrn={currentPatient.mrn || currentStudy?.patientMrn || currentStudy?.patientId}
            studyDescription={hasStudy ? currentStudy.studyDescription : 'Workstation Standby'} status={report.status as any}
            userName={currentUser?.name}
            userRole={currentUser?.title || currentUser?.role}
            userEmail={currentUser?.email}
            userStatus={currentUser?.status || (currentUser?.role === 'admin' ? 'Alpha Admin' : 'Workstation PRO')}
            onSave={() => handleSave()} onFinalize={() => handleSave('final')}
            onOpenCommandPalette={() => { setPacsSearchInitialFilter('all'); setIsPacsSearchOpen(true); }}
            onOpenPacsSearch={() => { setPacsSearchInitialFilter('all'); setIsPacsSearchOpen(true); }}
            onOpenMyCasesSearch={() => { setPacsSearchInitialFilter('me'); setIsPacsSearchOpen(true); }}
            onOpenFolderImport={(!hasStudy || reportingMode !== 'full') ? () => setIsFolderImportOpen(true) : undefined}
            currentCaseId={currentLocalCaseId} onOpenMobileNav={() => setMobileNavOpen(true)}
            onEditPatient={hasStudy ? () => setIsEditingPatient(true) : undefined}
            companionStudies={currentStudy?.companionStudies || activeStudy?.companionStudies}
            newerStudies={(currentStudy as any)?.newerStudies || (activeStudy as any)?.newerStudies}
            priorStudies={currentStudy?.priorStudies || activeStudy?.priorStudies}
            onShareCase={hasStudy ? () => setIsShareModalOpen(true) : undefined}
            reportSections={{ history: isSectionFilled(report.clinicalHistory), findings: isSectionFilled(report.findings), impression: isSectionFilled(report.impression) }}
            currentUserId={currentUser?.id}
          />

          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <StitchViewportStage
              reportingMode={reportingMode} onSelectReportingMode={setReportingMode} splitPercent={splitPercent} onSplitChange={setSplitPercent} onResetSplit={resetSplit}
              isDraggingSplit={isDragging} setIsDraggingSplit={setIsDragging} study={activeStudy} patient={activePatient}
              pgrName={pgrName} onPgrNameChange={setPgrName} consultantName={consultantName} onConsultantNameChange={setConsultantName}
              isLocalCase={currentIsLocalCase} localCaseId={currentLocalCaseId} localSeries={currentLocalSeries} seriesList={seriesList} activeSeriesIndex={activeSeriesIndex} seriesSelectToken={seriesSelectToken}
              onSelectSeries={handleSelectSeries} onActiveSeriesChange={setActiveSeriesIndex} paneSeriesMap={paneSeriesMap} onUpdatePaneSeries={handleUpdatePaneSeries}
              tool={tool} onSelectTool={setTool} preset={preset} onSelectPreset={setPreset} isCinePlaying={isCinePlaying} onToggleCine={() => setIsCinePlaying(!isCinePlaying)}
              syncScroll={syncScroll} onToggleSyncScroll={() => setSyncScroll(!syncScroll)} scoutLinesActive={scoutLinesActive} onToggleScoutLines={() => setScoutLinesActive((p) => !p)} onInvert={() => setInvert((p) => !p)}
              onReset={() => { setInvert(false); setResetKey((k) => k + 1); }} cadActive={cadActive} onToggleCad={() => setCadActive(!cadActive)} onExport={() => {}}
              invert={invert} resetKey={resetKey} is3DActive={is3DActive} onToggle3D={() => setIs3DActive((p) => !p)} gridRows={gridConfig.rows} gridCols={gridConfig.cols} onSelectGrid={handleSelectGrid}
              report={report} setReport={setReport} onOpenCommandPalette={() => { setPacsSearchInitialFilter('all'); setIsPacsSearchOpen(true); }}
              onStructure={handleStructureWithMedGemma} structuring={structuring} onSave={() => handleSave()} syncStatus={syncStatus} savedTime={savedTime}
              onSendToHmis={isHmisActive && !isClaimedByOther ? handleSendToHmisWithAutoClaim : undefined} sendingHmis={sendingHmis} onSubmitToHmis={isHmisActive && !isClaimedByOther ? handleSubmitToHmisWithAutoClaim : undefined} submittingHmis={submittingHmis}
              isFinalSubmitAllowed={Boolean(config.hmisAllowFinalSubmit)}
              onRevertHmis={isHmisActive && !isClaimedByOther ? handleRevertHmis : undefined} revertingHmis={revertingHmis} onSyncGoogleDoc={handleSyncGoogleDoc} syncingGoogleDoc={syncingGoogleDoc} googleDocUrl={googleDocUrl}
              isTakenUpByMe={isTakenUpByMe} isClaimedByOther={isClaimedByOther} claimedByName={claimedByName} claimingCase={claimingCase}
              onClaimCase={hasStudy && !isTakenUpByMe && !isClaimedByOther ? handleClaimCurrentStudy : undefined} hasStudy={hasStudy} recentCases={recentCases}
              onEditPatient={hasStudy ? () => setIsEditingPatient(true) : undefined} onOpenPacsSearch={() => { setPacsSearchInitialFilter('all'); setIsPacsSearchOpen(true); }}
              onOpenFolderImport={() => setIsFolderImportOpen(true)} onStartBlankReport={() => setReportingMode('modal')} onUploadGoogleDrive={hasStudy ? handleUploadStudyToGoogleDrive : undefined}
              uploadingGoogleDrive={uploadingToDrive} currentUser={currentUser} currentVersion={currentVersion} onVersionChange={setCurrentVersion}
              centerView={threeCol.centerView}
              onToggleCenterView={threeCol.toggleCenterView}
              isRightCompanionOpen={!threeCol.isRightCollapsed}
              onToggleRightCompanion={threeCol.toggleRightCollapsed}
              isStageMaximized={threeCol.isStageMaximized}
              onToggleStageMaximize={threeCol.toggleStageMaximize}
              rightColTab={threeCol.rightColTab}
              onSelectRightColTab={threeCol.setRightColTab}
            />
          </main>

          <div className="hidden md:block">
            <WorkstationFooter />
          </div>
        </div>
      </DicomDragDropZone>

      <ZenWorkstationModals
        isPacsSearchOpen={isPacsSearchOpen}
        onPacsSearchChange={setIsPacsSearchOpen}
        pacsSearchInitialFilter={pacsSearchInitialFilter}
        isFolderImportOpen={isFolderImportOpen}
        onFolderImportClose={() => setIsFolderImportOpen(false)}
        mobileNavOpen={mobileNavOpen}
        onMobileNavClose={() => setMobileNavOpen(false)}
        currentUser={currentUser}
        hasStudy={hasStudy}
        isShareModalOpen={isShareModalOpen}
        onShareModalClose={() => setIsShareModalOpen(false)}
        currentStudy={currentStudy}
        activeStudy={activeStudy}
        currentPatient={currentPatient}
        consultantName={consultantName}
        isEditingPatient={isEditingPatient}
        onEditingPatientClose={() => setIsEditingPatient(false)}
        onPatientUpdated={(u) => {
          const oldAcc = currentStudy?.accessionNumber || activeStudy?.accessionNumber;
          setCurrentStudy(u);
          setCurrentPatient({ id: u.patientId || currentPatient.id, fullName: u.patientName, mrNumber: u.patientMrn, mrn: u.patientMrn, age: String(u.age), gender: u.gender });
          if (u.accessionNumber && oldAcc && u.accessionNumber.toUpperCase() !== oldAcc.toUpperCase() && typeof window !== 'undefined') {
            window.location.replace(`/workspace/${encodeURIComponent(u.accessionNumber)}`);
          }
        }}
      />
    </div>
  );
}
