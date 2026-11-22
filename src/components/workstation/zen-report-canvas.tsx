'use client';

import React, { useState } from 'react';
import { ReportEditorState, ReportSyncStatus } from '@/hooks/use-report-editor-actions';
import { ReportingMode } from '@/hooks/use-reporting-layout';
import { HmisNormalTemplate } from '@/types/templates';
import { formatFullClinicalReport, findingsListToHtml } from '@/lib/clinical-format';
import { ZenReportHeader } from './zen-report-header';
import { ZenReportFooter } from './zen-report-footer';
import { ZenSectionsEditorView } from './zen-sections-editor-view';
import { ZenUnifiedEditorView } from './zen-unified-editor-view';
import { ZenReportToolbar } from './zen-report-toolbar';
import { CompanionTab } from '@/hooks/use-companion-panel';
import { useVoiceStudioDictation } from '@/hooks/use-voicestudio-dictation';
import { Loader2 } from 'lucide-react';
import { isSectionFilled } from './report-section-dots';
import { useZenReportExport } from '@/hooks/use-zen-report-export';
import { useQuickPolishReport } from '@/hooks/use-quick-polish-report';
import { useHmisDoctorSignature } from '@/hooks/use-hmis-doctor-signature';
import { ZenReportCanvasModals } from './zen-report-canvas-modals';
import { ConsultantDiscussionView } from '@/components/signout/consultant-discussion-view';
import { ZenConcurrencyBanner } from './zen-concurrency-banner';
import { ZenCriticalAlertBanner } from './zen-critical-alert-banner';
import { detectCriticalFindings } from '@/lib/critical-findings';
import { notify } from '@/services/notification.service';

export interface ZenReportCanvasProps {
  report: ReportEditorState; setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  studyId: string; reportId?: string; modality?: string; studyDescription?: string;
  patientName?: string; patientAge?: string | number; patientGender?: string; patientMrn?: string;
  accessionNumber?: string; pgrName?: string; onPgrNameChange?: (name: string) => void;
  consultantName?: string; onConsultantNameChange?: (name: string) => void;
  reportingMode?: ReportingMode; scrollMode?: 'sections' | 'unified';
  onSelectReportingMode?: (mode: ReportingMode) => void; onOpenCommandPalette?: () => void;
  onStructure?: () => void; structuring?: boolean; onMaximizeNotion?: () => void;
  onMinimizeToFab?: () => void; onPopOutModal?: () => void; onSave: (newStatus?: string, milestoneTag?: string) => Promise<any> | void;
  syncStatus?: ReportSyncStatus; savedTime?: string | null;
  onSendToHmis?: (options?: { deepVerify?: boolean }) => void; sendingHmis?: boolean;
  onSubmitToHmis?: (options?: { deepVerify?: boolean }) => void; submittingHmis?: boolean;
  isFinalSubmitAllowed?: boolean; onRevertHmis?: () => void; revertingHmis?: boolean; hmisNotice?: string | null;
  onSyncGoogleDoc?: () => void; syncingGoogleDoc?: boolean; googleDocUrl?: string | null;
  isCompanionOpen?: boolean; onToggleCompanion?: () => void; onOpenCompanionTab?: (tab: CompanionTab) => void;
  isTakenUpByMe?: boolean; isClaimedByOther?: boolean; claimedByName?: string;
  onClaimCase?: () => void; claimingCase?: boolean; onEditPatient?: () => void; onOpenInsights?: () => void;
  currentVersion?: number; onVersionChange?: (version: number) => void;
}

export function ZenReportCanvas({
  report, setReport, studyId, reportId, currentVersion = 1, onVersionChange,
  modality = 'CT', studyDescription, patientName, patientAge, patientGender, patientMrn,
  accessionNumber, pgrName = '', onPgrNameChange, consultantName = '', onConsultantNameChange,
  reportingMode, scrollMode = 'sections', onSelectReportingMode, onMinimizeToFab, onPopOutModal,
  onMaximizeNotion, onSave, syncStatus = 'saved', savedTime, onSendToHmis, sendingHmis = false,
  onSubmitToHmis, submittingHmis = false, isFinalSubmitAllowed = false, onRevertHmis, revertingHmis = false,
  hmisNotice, onSyncGoogleDoc, syncingGoogleDoc = false, googleDocUrl, isCompanionOpen = false,
  onToggleCompanion, onOpenCompanionTab, isTakenUpByMe, isClaimedByOther, claimedByName,
  onClaimCase, claimingCase, onEditPatient, onOpenInsights,
}: ZenReportCanvasProps) {
  const [templateRev, setTemplateRev] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [openDiffDirectly, setOpenDiffDirectly] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [reportingTab, setReportingTab] = useState<'standard' | 'discussion'>('standard');

  const { isPolishingWholeReport, polishNotice, handleQuickPolishWholeReport } = useQuickPolishReport({
    report, setReport, setTemplateRev, modality, studyDescription, patientAge, patientGender, patientName, pgrName,
  });

  const { handleExportPdf, handleExportDocx, isExporting } = useZenReportExport({
    report, studyId, reportId, modality, studyDescription,
    patientName, patientAge, patientGender, patientMrn, accessionNumber,
    pgrName, consultantName,
  });

  // Dynamically ensure HMIS Reporting Doctor signature is present inside the impression
  useHmisDoctorSignature(pgrName, setReport, {
    isTakenUpByMe,
    isClaimedByOther,
    reportStatus: report.status,
  });

  const {
    isRecording,
    isProcessing,
    toggleRecording,
    errorMessage: dictationError,
  } = useVoiceStudioDictation({
    modality,
    studyDescription,
    clinicalHistory: report.clinicalHistory,
    patientAge: patientAge !== undefined && patientAge !== null ? String(patientAge) : undefined,
    patientGender,
    patientName,
    patientMrn,
    accessionNumber,
    studyId,
    source: 'reporting_canvas',
    radiologistName: pgrName,
    onSuccess: (result) => {
      if (!result.structured) return;
      const structured = result.structured;
      setReport((prev) => {
        const hasFindings = prev.findings && prev.findings !== '<p></p>' && prev.findings.trim() !== '';
        const newFindings = hasFindings
          ? `${prev.findings}${structured.findings}`
          : structured.findings;

        const hasImpression = prev.impression && prev.impression !== '<p></p>' && prev.impression.trim() !== '';
        const newImpression = hasImpression
          ? `${prev.impression}\n${structured.impression}`
          : structured.impression;

        const hasHistory = prev.clinicalHistory && prev.clinicalHistory !== '<p></p>' && prev.clinicalHistory.trim() !== '';
        const newHistory = hasHistory
          ? prev.clinicalHistory
          : structured.clinicalHistory || prev.clinicalHistory;

        return {
          ...prev,
          clinicalHistory: newHistory,
          technique: structured.technique || prev.technique,
          findings: newFindings,
          impression: newImpression,
        };
      });
      setTemplateRev((r) => r + 1);
    },
  });

  // Global Alt+D (VoiceStudio dictation) and Alt+C / Alt+R (Toggle Consultant Discussion)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (!isTakenUpByMe) {
          notify.warning('Please click "Take Up Case" to claim this study before starting dictation.');
          return;
        }
        toggleRecording();
      } else if (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setReportingTab((prev) => (prev === 'standard' ? 'discussion' : 'standard'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording, isTakenUpByMe]);

  const handleApplyTemplate = (tpl: HmisNormalTemplate) => {
    if (!isTakenUpByMe) {
      notify.warning('Please click "Take Up Case" to claim this study before applying templates.');
      return;
    }
    const findingsHtml = findingsListToHtml(tpl.normalFindings);
    const impressionLines = tpl.defaultImpression
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `<p>${l}</p>`)
      .join('');
    const signatureHtml = pgrName && pgrName.trim() && pgrName.trim() !== 'Resident Radiologist'
      ? `<p><br></p><p><strong>Reported by: </strong><em>${pgrName.trim()}</em></p>`
      : '';
    const impressionHtml = `${impressionLines}${signatureHtml}`;

    setReport((prev) => ({
      ...prev,
      findings: findingsHtml,
      impression: impressionHtml,
    }));
    setTemplateRev((r) => r + 1);
  };

  const plainText = `${report.findings || ''} ${report.impression || ''}`.replace(/<[^>]*>/g, ' ').trim();
  const wordCount = plainText.length > 0 ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const footerNotice = polishNotice || (dictationError ? `⚠️ ${dictationError}` : (isClaimedByOther ? `🔒 Case claimed by ${claimedByName || 'another doctor'}` : hmisNotice));

  const criticalMatches = React.useMemo(() => {
    return detectCriticalFindings(`${report.findings || ''} ${report.impression || ''}`);
  }, [report.findings, report.impression]);

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface select-text overflow-hidden relative">
      {/* 1. Panel Header */}
      <ZenReportHeader
        patientName={patientName}
        patientAge={patientAge}
        patientGender={patientGender}
        patientMrn={patientMrn}
        accessionNumber={accessionNumber}
        modality={modality}
        studyDescription={studyDescription}
        onEditPatient={onEditPatient}
        syncStatus={syncStatus}
        savedTime={savedTime}
        currentVersion={currentVersion || 1}
        reportingMode={reportingMode}
        onSelectReportingMode={onSelectReportingMode}
        onMinimizeToFab={onMinimizeToFab}
        onPopOutModal={onPopOutModal}
        onMaximizeNotion={onMaximizeNotion}
        reportSections={{
          history: isSectionFilled(report.clinicalHistory),
          findings: isSectionFilled(report.findings),
          impression: isSectionFilled(report.impression),
        }}
        onOpenHistory={() => {
          setOpenDiffDirectly(false);
          setIsHistoryOpen(true);
        }}
        onOpenDiff={() => {
          setOpenDiffDirectly(true);
          setIsHistoryOpen(true);
        }}
        onApplyTemplate={handleApplyTemplate}
        onSaveAsTemplate={() => setIsSaveTemplateOpen(true)}
      />

      {/* Concurrency & Observation Guard Banner */}
      <ZenConcurrencyBanner
        accessionNumber={accessionNumber}
        isTakenUpByMe={isTakenUpByMe}
        isClaimedByOther={isClaimedByOther}
        claimedByName={claimedByName}
        onClaimCase={onClaimCase}
        claimingCase={claimingCase}
      />

      {/* 2. Centered Sticky Floating [ Report | Discuss ] Switch Pill */}
      <ZenReportToolbar
        reportingTab={reportingTab}
        onSelectReportingTab={setReportingTab}
      />

      {/* Acute Critical Findings Radar (Emergency Scans) */}
      <ZenCriticalAlertBanner
        criticalMatches={criticalMatches}
        patientName={patientName}
        patientMrn={patientMrn}
        accessionNumber={accessionNumber}
        modality={modality}
        doctorName={pgrName}
      />

      {/* Polish Feedback Banner */}
      {polishNotice && (
        <div
          className={`px-3 py-1 text-[11px] font-mono flex items-center justify-between transition-all shrink-0 select-none ${
            polishNotice.startsWith('✓')
              ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20'
              : polishNotice.startsWith('⚠️')
              ? 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20'
              : 'bg-primary/10 text-primary border-b border-primary/20 animate-pulse'
          }`}
        >
          <span>{polishNotice}</span>
          {isPolishingWholeReport && <Loader2 className="w-3 h-3 animate-spin ml-2 shrink-0" />}
        </div>
      )}

      {/* 3. Clinical Editorial Content: Standard Sections/Unified vs Embedded Consultant Discussion */}
      {reportingTab === 'discussion' ? (
        <ConsultantDiscussionView
          report={report}
          setReport={setReport}
          modality={modality}
          studyDescription={studyDescription}
          pgrName={pgrName}
          onSwitchToStandard={() => setReportingTab('standard')}
          studyId={studyId}
          accessionNumber={accessionNumber}
          reportId={reportId}
          onSave={onSave ? async (s, t) => { await onSave(s, t); } : undefined}
          currentVersion={currentVersion}
        />
      ) : scrollMode === 'unified' ? (
        <ZenUnifiedEditorView
          report={report} setReport={setReport} studyId={studyId} modality={modality}
          templateRev={templateRev} onOpenCompanionTab={onOpenCompanionTab}
          onApplyTemplate={handleApplyTemplate} onSaveAsTemplate={() => setIsSaveTemplateOpen(true)}
          onOpenCopilotChat={() => onOpenCompanionTab?.('chat') || onToggleCompanion?.()}
          onQuickPolishWholeReport={handleQuickPolishWholeReport} isPolishingWholeReport={isPolishingWholeReport}
          readOnly={!isTakenUpByMe}
        />
      ) : (
        <ZenSectionsEditorView
          report={report} setReport={setReport} studyId={studyId} modality={modality}
          studyDescription={studyDescription}
          templateRev={templateRev} onOpenCompanionTab={onOpenCompanionTab}
          onApplyTemplate={handleApplyTemplate} onSaveAsTemplate={() => setIsSaveTemplateOpen(true)}
          readOnly={!isTakenUpByMe}
        />
      )}

      {/* 4. Bottom Footer */}
      <ZenReportFooter
        dictationActive={isRecording} dictationProcessing={isProcessing}
        onToggleDictation={toggleRecording} onSave={onSave}
        copyReportText={() => formatFullClinicalReport({
          patientName: patientName || 'Patient', patientMrn, accessionNumber, modality,
          studyDescription: studyDescription || 'Diagnostic Examination', clinicalHistory: report.clinicalHistory,
          technique: report.technique, findings: report.findings, impression: report.impression,
          authorName: pgrName, consultantName,
        })}
        onSendToHmis={onSendToHmis} sendingHmis={sendingHmis}
        onSubmitToHmis={onSubmitToHmis ? () => setIsSubmitConfirmOpen(true) : undefined} submittingHmis={submittingHmis} isFinalSubmitAllowed={isFinalSubmitAllowed}
        onRevertHmis={onRevertHmis} revertingHmis={revertingHmis}
        onSyncGoogleDoc={onSyncGoogleDoc} syncingGoogleDoc={syncingGoogleDoc} googleDocUrl={googleDocUrl}
        onExportPdf={handleExportPdf} onExportDocx={handleExportDocx} exportingPdf={isExporting} exportingDocx={isExporting}
        notice={footerNotice} wordCount={wordCount}
      />

      <ZenReportCanvasModals
        isHistoryOpen={isHistoryOpen}
        onCloseHistory={() => {
          setIsHistoryOpen(false);
          setOpenDiffDirectly(false);
        }}
        initialDiffOpen={openDiffDirectly}
        reportId={reportId || studyId}
        studyId={studyId}
        accessionNumber={accessionNumber}
        currentVersion={currentVersion || 1}
        onVersionChange={onVersionChange}
        setReport={setReport}
        isSaveTemplateOpen={isSaveTemplateOpen}
        onCloseSaveTemplate={() => setIsSaveTemplateOpen(false)}
        modality={modality}
        studyDescription={studyDescription}
        report={report}
        isSubmitConfirmOpen={isSubmitConfirmOpen}
        onCloseSubmitConfirm={() => setIsSubmitConfirmOpen(false)}
        onConfirmSubmit={() => {
          setIsSubmitConfirmOpen(false);
          onSubmitToHmis?.({ deepVerify: true });
        }}
        submittingHmis={submittingHmis}
        patientName={patientName}
        patientAge={patientAge}
        patientGender={patientGender}
        patientMrn={patientMrn}
        pgrName={pgrName}
        consultantName={consultantName}
      />
    </div>
  );
}
