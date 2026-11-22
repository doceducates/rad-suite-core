'use client';

// Layer 4 (Presentation): Quick In-Place Report Modal with Case Assignment Gating
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorklistReportModalHeader } from './worklist-report-modal-header';
import { WorklistReportModalBody } from './worklist-report-modal-body';
import { WorklistReportModalReader } from './worklist-report-modal-reader';
import { WorklistReportModalFooter } from './worklist-report-modal-footer';
import { WorklistEditPatientModal } from './worklist-edit-patient-modal';
import { LghReportModal } from '@/components/reports/lgh-report-modal';
import { WORKLIST_TEMPLATES } from './worklist-templates';
import { clinicalTextToHtml } from '@/lib/clinical-format';
import { saveWorklistReportPayload, loadInitialWorklistReport, copyFullReportText } from './worklist-report-save';
import { notify } from '@/services/notification.service';
import { useWorklistReportIntegrations } from '@/hooks/use-worklist-report-integrations';
import { config } from '@/lib/config';
import { isSameRadiologistUser } from '@/services/unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';
import type { ReportStatus } from '@/types';

interface WorklistReportModalProps {
  study: PacsStudyResult | null;
  isOpen: boolean;
  onClose: () => void;
  onReportSaved?: (updatedStudy: PacsStudyResult) => void;
  currentUserId?: string;
  onClaimCase?: (accessionNumber: string) => Promise<any> | void;
}

export function WorklistReportModal({
  study,
  isOpen,
  onClose,
  onReportSaved,
  currentUserId,
  onClaimCase,
}: WorklistReportModalProps) {
  const [activeStudy, setActiveStudy] = useState<PacsStudyResult | null>(study);
  const [viewMode, setViewMode] = useState<'read' | 'edit'>('read');
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [history, setHistory] = useState('');
  const [technique, setTechnique] = useState('');
  const [findings, setFindings] = useState('');
  const [findingsHtml, setFindingsHtml] = useState('');
  const [impression, setImpression] = useState('');
  const [impressionHtml, setImpressionHtml] = useState('');
  const [status, setStatus] = useState<ReportStatus>('draft');
  const [criticalFinding, setCriticalFinding] = useState(false);
  const [reportId, setReportId] = useState<string | undefined>(study?.reportId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimingCase, setClaimingCase] = useState(false);
  const [showOfficialModal, setShowOfficialModal] = useState(false);
  const [consultantName, setConsultantName] = useState('');

  const loadedStudyKeyRef = useRef<string | null>(null);
  const handleSaveRef = useRef<((targetStatus?: ReportStatus) => Promise<void>) | null>(null);

  const onEnsureReportSaved = useCallback(async () => {
    if (handleSaveRef.current) {
      await handleSaveRef.current(status);
    }
    return reportId;
  }, [status, reportId]);

  const {
    sendingHmis, submittingHmis, revertingHmis, hmisNotice,
    syncingGoogleDoc, googleDocUrl, setGoogleDocUrl, googleNotice,
    resetNotices, handleSendToHmis, handleSubmitFinalToHmis, handleRevertHmis, handleSyncGoogleDoc,
  } = useWorklistReportIntegrations({
    study: activeStudy,
    technique,
    findings,
    impression,
    history,
    reportId,
    onEnsureReportSaved,
    setErrorMessage,
  });

  const loadData = useCallback(async (targetStudy: PacsStudyResult) => {
    setLoading(true);
    try {
      const rep = await loadInitialWorklistReport(targetStudy);
      if (rep) {
        setReportId(rep.id);
        setHistory(rep.history);
        setTechnique(rep.technique);
        setFindings(rep.findings);
        setFindingsHtml(rep.findingsHtml);
        setImpression(rep.impression);
        setImpressionHtml(rep.impressionHtml);
        setStatus(rep.status as ReportStatus);
        setCriticalFinding(Boolean(rep.criticalFinding));
        if (rep.googleDocUrl) setGoogleDocUrl(rep.googleDocUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading report');
    } finally {
      setLoading(false);
    }
  }, [setGoogleDocUrl]);

  const resetStudyState = useCallback((target: PacsStudyResult) => {
    loadedStudyKeyRef.current = `${target.studyId || ''}:${target.accessionNumber || ''}`;
    setActiveStudy(target);
    setReportId(target.reportId);
    resetNotices();
    const s = target.status || 'draft';
    setStatus(['final', 'finalized', 'reported'].includes(s) ? 'final' : ['preliminary', 'submitted', 'amended'].includes(s) ? (s as ReportStatus) : 'draft');
    setCriticalFinding(Boolean(target.criticalFinding));
    setErrorMessage(null);
    setSavedTime(null);
    setCopied(false);
    setViewMode('read');
    loadData(target);
  }, [resetNotices, loadData]);

  useEffect(() => {
    if (!study || !isOpen) {
      loadedStudyKeyRef.current = null;
      return;
    }
    const currentKey = `${study.studyId || ''}:${study.accessionNumber || ''}`;
    if (loadedStudyKeyRef.current === currentKey) return;
    resetStudyState(study);
  }, [study, isOpen, resetStudyState]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !study) return null;

  const targetStudy = activeStudy || study;
  const isTakenUpByMe = isSameRadiologistUser(targetStudy.assignedRadiologistId, currentUserId);
  const isClaimedByOther = Boolean(targetStudy.assignedRadiologistId && !isTakenUpByMe);

  const handleSelectCompanion = (acc: string) => {
    if (!study || acc === targetStudy.accessionNumber) return;
    const companion = study.companionStudies?.find((cs) => cs.accessionNumber === acc);
    const target: PacsStudyResult = companion
      ? { ...study, accessionNumber: companion.accessionNumber, studyDescription: companion.studyDescription, modality: companion.modality || study.modality, status: (companion.status as any) || 'draft' }
      : study;
    resetStudyState(target);
  };

  const handleClaimCurrentCase = async () => {
    if (!activeStudy?.accessionNumber || !onClaimCase) return;
    setClaimingCase(true);
    try {
      await onClaimCase(activeStudy.accessionNumber);
      if (currentUserId) setActiveStudy((prev) => (prev ? { ...prev, assignedRadiologistId: currentUserId } : prev));
      notify.success('Case taken up successfully! Reporting unlocked.');
    } catch (err: any) {
      notify.error(err.message || 'Failed to take up case');
    } finally {
      setClaimingCase(false);
    }
  };

  const handleApplyTemplate = (tplKey: string) => {
    const tpl = WORKLIST_TEMPLATES[tplKey];
    if (tpl) {
      if (tpl.technique) setTechnique(tpl.technique);
      setFindings(tpl.findings);
      setFindingsHtml(clinicalTextToHtml(tpl.findings));
      setImpression(tpl.impression);
      setImpressionHtml(clinicalTextToHtml(tpl.impression));
    }
  };

  const handleCopyReport = async () => {
    const target = activeStudy || study;
    const success = await copyFullReportText({
      patientName: target.patientName,
      patientMrn: target.patientMrn || target.patientId,
      accessionNumber: target.accessionNumber,
      modality: target.modality,
      studyDescription: target.studyDescription,
      studyDate: target.studyDate,
      clinicalHistory: history,
      technique,
      findings,
      impression,
    });
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async (targetStatus?: ReportStatus) => {
    setSaving(true);
    setErrorMessage(null);
    const newStatus = targetStatus || status;

    try {
      const { reportId: newReportId } = await saveWorklistReportPayload({
        reportId,
        study: targetStudy,
        history,
        technique,
        findings,
        impression,
        status: newStatus,
        criticalFinding,
      });

      setReportId(newReportId);
      setStatus(newStatus);
      setSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      onReportSaved?.({
        ...targetStudy,
        reportId: newReportId,
        status: newStatus,
        criticalFinding,
        priority: criticalFinding ? 'stat' : targetStudy.priority,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving report');
    } finally {
      setSaving(false);
    }
  };
  handleSaveRef.current = handleSave;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-outline-variant rounded-none sm:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden"
      >
        <WorklistReportModalHeader
          study={targetStudy}
          copied={copied}
          onCopyReport={handleCopyReport}
          onPrintOfficialReport={() => setShowOfficialModal(true)}
          onEditPatient={() => setIsEditingPatient(true)}
          onClose={onClose}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          companionStudies={study.companionStudies}
          activeAccession={targetStudy.accessionNumber}
          onSelectStudy={handleSelectCompanion}
        />

        {viewMode === 'read' ? (
          <WorklistReportModalReader
            study={targetStudy}
            history={history}
            technique={technique}
            findings={findings}
            findingsHtml={findingsHtml}
            impression={impression}
            impressionHtml={impressionHtml}
            pgrName={targetStudy.assignedRadiologistName || 'Reporting Radiologist'}
            consultantName=""
            onSwitchToEdit={() => setViewMode('edit')}
          />
        ) : (
          <WorklistReportModalBody
            modality={targetStudy.modality}
            errorMessage={errorMessage}
            history={history}
            setHistory={setHistory}
            technique={technique}
            setTechnique={setTechnique}
            findings={findings}
            setFindings={(val) => { setFindings(val); if (typeof val === 'string') setFindingsHtml(clinicalTextToHtml(val)); }}
            impression={impression}
            setImpression={(val) => { setImpression(val); if (typeof val === 'string') setImpressionHtml(clinicalTextToHtml(val)); }}
            criticalFinding={criticalFinding}
            setCriticalFinding={setCriticalFinding}
            savedTime={savedTime}
            onApplyTemplate={handleApplyTemplate}
          />
        )}

        <WorklistReportModalFooter
          status={status}
          setStatus={setStatus}
          hmisNotice={hmisNotice}
          googleNotice={googleNotice}
          googleDocUrl={googleDocUrl}
          syncingGoogleDoc={syncingGoogleDoc}
          revertingHmis={revertingHmis}
          sendingHmis={sendingHmis}
          saving={saving}
          loading={loading}
          isTakenUpByMe={isTakenUpByMe}
          isClaimedByOther={isClaimedByOther}
          assignedDoctorName={targetStudy.assignedRadiologistName}
          onClaimCase={onClaimCase ? handleClaimCurrentCase : undefined}
          claimingCase={claimingCase}
          onSyncGoogleDoc={handleSyncGoogleDoc}
          onRevertHmis={handleRevertHmis}
          onSendToHmis={handleSendToHmis}
          onSaveDraft={() => handleSave(status)}
          onFinalize={() => handleSave('final')}
          isFinalSubmitAllowed={Boolean(config.hmisAllowFinalSubmit)}
          onSubmitFinalToHmis={handleSubmitFinalToHmis}
          submittingHmis={submittingHmis}
          patientName={targetStudy.patientName}
          patientMrn={targetStudy.patientMrn || targetStudy.patientId}
          accessionNumber={targetStudy.accessionNumber}
          studyDescription={targetStudy.studyDescription}
          companionStudies={study.companionStudies}
        />

        <WorklistEditPatientModal
          isOpen={isEditingPatient}
          study={targetStudy}
          onClose={() => setIsEditingPatient(false)}
          onPatientUpdated={(updated) => {
            setActiveStudy(updated);
            onReportSaved?.(updated);
          }}
        />

        {showOfficialModal && (
          <LghReportModal
            isOpen={showOfficialModal} onClose={() => setShowOfficialModal(false)}
            study={targetStudy}
            patient={{ fullName: targetStudy.patientName, age: targetStudy.age, gender: targetStudy.gender, mrNumber: targetStudy.patientMrn || targetStudy.patientId, clinicalHistory: history }}
            report={{ id: reportId, findings, impression, technique, clinicalHistory: history, status }}
            pgrName={targetStudy.assignedRadiologistName || 'Resident Radiologist'}
            onPgrNameChange={() => {}} consultantName={consultantName} onConsultantNameChange={setConsultantName}
          />
        )}
      </div>
    </div>
  );
}
