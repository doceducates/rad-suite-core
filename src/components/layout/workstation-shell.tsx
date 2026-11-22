'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DicomViewer } from '@/components/dicom/dicom-viewer';
import { ReportEditor } from '@/components/editor/report-editor';
import { CompactStatusBar } from '@/components/editor/compact-status-bar';
import { CommandPalette, CommandAction } from '@/components/editor/command-palette';
import { WorkstationModals } from '@/components/editor/workstation-modals';
import { FloatingDictationFab } from '@/components/editor/floating-dictation-fab';
import { TranscribeDrawer } from '@/components/editor/transcribe-drawer';
import { useReportEditorActions, ReportEditorState } from '@/hooks/use-report-editor-actions';
import { getStandardizedTemplateById } from '@/services/cross-sectional';
import { findingsListToHtml } from '@/lib/clinical-format';
import { CrossSectionalTemplate, HmisNormalTemplate } from '@/types/templates';

interface WorkstationShellProps {
  study: any;
  patient: any;
  report: any;
}

export function WorkstationShell({ study, patient, report: initialReport }: WorkstationShellProps) {
  const router = useRouter();
  const [report, setReport] = useState<ReportEditorState>({
    technique: initialReport?.technique || '',
    comparison: initialReport?.comparison || '',
    findings: initialReport?.findings || '',
    impression: initialReport?.impression || '',
    status: initialReport?.status || 'draft',
    criticalFinding: initialReport?.criticalFinding || false,
  });

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showMorningDiff, setShowMorningDiff] = useState(false);
  const [showOfficialModal, setShowOfficialModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pgrName, setPgrName] = useState('Reporting Radiologist');
  const [consultantName, setConsultantName] = useState('Dr.');
  const [externalFindings, setExternalFindings] = useState<string | undefined>();
  const [externalImpression, setExternalImpression] = useState<string | undefined>();

  const {
    saving,
    savedTime,
    structuring,
    structuredNotice,
    setStructuredNotice,
    sendingHmis,
    handleStructureWithMedGemma,
    handleSave,
    handleSendToHmis,
  } = useReportEditorActions({
    report,
    setReport,
    studyId: study.id,
    modality: study.modality,
    initialReportId: initialReport?.id,
    study,
    patient,
    pgrName,
    consultantName,
  });

  const applyTemplate = useCallback((tpl: CrossSectionalTemplate | HmisNormalTemplate) => {
    const findingsHtml = findingsListToHtml(tpl.normalFindings);
    const impressionHtml = tpl.defaultImpression.includes('\n')
      ? tpl.defaultImpression.split('\n').map((l) => `<p>${l}</p>`).join('')
      : `<p>${tpl.defaultImpression}</p>`;
    setReport((prev) => ({
      ...prev,
      technique: tpl.technique,
      findings: findingsHtml,
      impression: impressionHtml,
    }));
  }, []);

  const handleCommandAction = useCallback((action: CommandAction) => {
    if (action.type === 'template') {
      const tpl = getStandardizedTemplateById(action.id);
      if (tpl) applyTemplate(tpl);
    } else if (action.type === 'macro') {
      setReport((prev) => ({
        ...prev,
        findings: (prev.findings ? prev.findings + '<p>' : '<p>') + action.text + '</p>',
      }));
    } else if (action.type === 'ai') {
      if (action.action === 'structure') {
        handleStructureWithMedGemma();
      }
    } else if (action.type === 'action') {
      switch (action.action) {
        case 'save': handleSave(); break;
        case 'finalize': handleSave('final'); break;
        case 'hmis': handleSendToHmis(); break;
        case 'hospital-report': setShowOfficialModal(true); break;
        case 'morning-diff': setShowMorningDiff(true); break;
        case 'dictation': setIsDrawerOpen((p) => !p); break;
        case 'radiant':
          window.location.href = `radiant://?accession=${encodeURIComponent(study.accessionNumber)}`;
          break;
      }
    }
  }, [applyTemplate, handleSave, handleSendToHmis, handleStructureWithMedGemma, study.accessionNumber]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 sm:-m-6 overflow-hidden bg-background text-foreground">
      {/* 32px Ultra-compact Status Bar */}
      <CompactStatusBar
        patientName={patient.fullName}
        age={patient.age}
        gender={patient.gender}
        modality={study.modality}
        accessionNumber={study.accessionNumber}
        status={report.status as 'draft' | 'final' | 'pending'}
        savedTime={savedTime}
        saving={saving}
        onSave={() => handleSave()}
        onFinalize={() => handleSave('final')}
        onMore={() => setIsCommandOpen(true)}
        onBack={() => router.push('/worklist')}
        onPending={() => setShowPendingModal(true)}
        pendingReason={(report as any).pendingReason}
      />

      {/* Main Split Workstation */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 min-h-0 overflow-hidden">
        {/* Left: Responsive DICOM Viewport */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-black rounded-lg border border-border/50 overflow-hidden shadow-xs">
          <DicomViewer accessionNumber={study.accessionNumber} modality={study.modality} />
        </div>

        {/* Right: Focused Clinical Report Editor */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-card/60 rounded-lg border border-border/50 p-2.5 overflow-hidden shadow-xs">
          <ReportEditor
            report={report}
            setReport={setReport}
            studyId={study.id}
            patientId={patient.id}
            modality={study.modality}
            pgrName={pgrName}
            externalFindings={externalFindings}
            externalImpression={externalImpression}
            onOpenCommandPalette={() => setIsCommandOpen(true)}
            onStructure={handleStructureWithMedGemma}
            structuring={structuring}
            structuredNotice={structuredNotice}
            setStructuredNotice={setStructuredNotice}
          />
        </div>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        onAction={handleCommandAction}
        modality={study.modality}
      />

      {/* Auxiliary Reporting Modals */}
      <WorkstationModals
        showTemplateModal={showTemplateModal}
        setShowTemplateModal={setShowTemplateModal}
        showMorningDiff={showMorningDiff}
        setShowMorningDiff={setShowMorningDiff}
        showOfficialModal={showOfficialModal}
        setShowOfficialModal={setShowOfficialModal}
        showPendingModal={showPendingModal}
        setShowPendingModal={setShowPendingModal}
        onPendingSaved={(reason, notes) => {
          setReport((prev: any) => ({
            ...prev,
            pendingReason: reason,
            pendingNotes: notes,
          }));
        }}
        study={study}
        patient={patient}
        report={report}
        pgrName={pgrName}
        onPgrNameChange={setPgrName}
        consultantName={consultantName}
        onConsultantNameChange={setConsultantName}
        onApplyTemplate={applyTemplate}
        onSave={handleSave}
        onSendToHmis={handleSendToHmis}
        sendingHmis={sendingHmis}
        modality={study.modality}
      />

      {/* Floating Dictation Fab */}
      <FloatingDictationFab
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
      />

      {/* Collapsible Dictation Drawer */}
      <TranscribeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onInsertFindings={(txt) => setExternalFindings(txt)}
        onInsertImpression={(txt) => setExternalImpression(txt)}
        onApplyStructuredReport={(data) => {
          setReport(prev => ({
            ...prev,
            technique: data.technique,
            findings: data.findings,
            impression: data.impression
          }));
          setIsDrawerOpen(false);
        }}
        pgrName={pgrName}
      />
    </div>
  );
}
