'use client';

import { useState, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { notify } from '@/services/notification.service';
import { useReportExternalSync } from './use-report-external-sync';
import { isUuid, sanitizeMrn } from '@/lib/mrn-security';

export interface ReportEditorState {
  clinicalHistory?: string;
  technique: string;
  comparison: string;
  findings: string;
  impression: string;
  status: string;
  criticalFinding: boolean;
  contentJson?: any;
  discussionJson?: any;
}

export type ReportSyncStatus = 'saved' | 'saving' | 'dirty' | 'error';

interface UseReportEditorActionsProps {
  report: ReportEditorState;
  setReport: Dispatch<SetStateAction<ReportEditorState>>;
  studyId: string;
  modality: string;
  initialReportId?: string;
  initialVersion?: number;
  initialGoogleDocUrl?: string;
  study?: any;
  patient?: any;
  pgrName: string;
  consultantName: string;
  isTakenUpByMe?: boolean;
  userRole?: string;
}

export function useReportEditorActions({
  report,
  setReport,
  studyId,
  modality,
  initialReportId,
  initialVersion = 1,
  initialGoogleDocUrl,
  study,
  patient,
  pgrName,
  consultantName,
  isTakenUpByMe = false,
  userRole,
}: UseReportEditorActionsProps) {
  const [saving, setSaving] = useState(false);
  const [savedTime, setSavedTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<ReportSyncStatus>('saved');
  const [currentVersion, setCurrentVersion] = useState<number>(initialVersion || 1);
  const [structuring, setStructuring] = useState(false);
  const [structuredNotice, setStructuredNotice] = useState<string | null>(null);

  const [activeReportId, setActiveReportId] = useState<string | undefined>(initialReportId);
  const activeReportIdRef = useRef<string | undefined>(initialReportId);

  useEffect(() => {
    setActiveReportId(initialReportId);
    activeReportIdRef.current = initialReportId;
  }, [initialReportId]);

  useEffect(() => {
    if (initialVersion && initialVersion > 0) {
      setCurrentVersion(initialVersion);
    }
  }, [initialVersion]);

  const isInitialMount = useRef(true);
  const lastSavedJsonRef = useRef(JSON.stringify(report));

  const buildPayload = (extraStatus?: string, isAutoSave = false, milestoneTag?: string) => {
    const rawG = String(patient?.gender || study?.gender || '').trim().toUpperCase();
    const gender = (rawG === 'M' || rawG === 'MALE') ? 'Male' : (rawG === 'F' || rawG === 'FEMALE') ? 'Female' : rawG === 'OTHER' ? 'Other' : undefined;
    const rawAge = patient?.age ?? study?.age;
    const age = rawAge !== undefined && rawAge !== null && rawAge !== '' && !isNaN(Number(rawAge)) ? Math.round(Number(rawAge)) : undefined;

    return {
      ...report,
      criticalFinding: Boolean(report.criticalFinding),
      status: extraStatus || report.status,
      reportId: activeReportIdRef.current,
      studyId,
      accessionNumber: study?.accessionNumber,
      patientMrn: sanitizeMrn(patient?.mrNumber) || sanitizeMrn(patient?.mrn) || sanitizeMrn(study?.patientMrn) || (!isUuid(study?.patientId) ? study?.patientId : ''),
      patientName: patient?.fullName || study?.patientName,
      age, gender,
      modality: modality || study?.modality,
      studyDescription: study?.studyDescription || study?.scanType,
      isAutoSave: Boolean(isAutoSave),
      milestoneTag,
    };
  };

  // Continuous background auto-save (working draft preservation without version spam)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Strict concurrency guard: Auto-save only fires if current doctor has taken up the case or is admin
    if (!isTakenUpByMe && userRole !== 'admin') {
      return;
    }

    const currentJson = JSON.stringify(report);
    if (currentJson === lastSavedJsonRef.current) return;

    if (!studyId && !study?.accessionNumber && !activeReportIdRef.current) {
      return;
    }

    setSyncStatus('dirty');
    const timer = setTimeout(async () => {
      setSyncStatus('saving');
      try {
        const bodyPayload = buildPayload(undefined, true);
        const res = await fetch(`/api/reports/${activeReportIdRef.current || 'new'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.reportId && data.reportId !== activeReportIdRef.current) {
            activeReportIdRef.current = data.reportId;
            setActiveReportId(data.reportId);
          }
          if (data.version && currentVersion === 1) {
            setCurrentVersion(data.version);
          }
          lastSavedJsonRef.current = currentJson;
          setSyncStatus('saved');
          setSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setSyncStatus('error');
          const errData = await res.json().catch(() => ({}));
          const reason = errData.error || errData.message || `Server returned HTTP ${res.status}`;
          notify.error('Auto-save failed', {
            id: 'autosave-status-error',
            description: reason,
          });
        }
      } catch (err: any) {
        setSyncStatus('error');
        notify.error('Auto-save failed', {
          id: 'autosave-status-error',
          description: err.message || 'Cannot reach database server',
        });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [report, studyId, study, patient, modality, isTakenUpByMe, userRole]);

  const handleStructureWithMedGemma = async () => {
    setStructuring(true);
    setStructuredNotice(null);
    try {
      const plainText = `${report.findings} ${report.impression}`.replace(/<[^>]*>/g, ' ').trim();
      const res = await fetch('/api/ai/structure-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plainText || report.findings,
          modality: modality || study?.modality,
          studyDescription: study?.studyDescription || study?.scanType,
          clinicalHistory: report.clinicalHistory || study?.clinicalHistory,
          patientAge: patient?.age || study?.age,
          patientGender: patient?.gender || study?.gender,
          patientName: patient?.fullName || study?.patientName,
          radiologistName: pgrName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const { technique, findings, impression, clinicalHistory, correctedTerms } = data;
        setReport((prev) => ({
          ...prev,
          clinicalHistory: clinicalHistory || prev.clinicalHistory,
          technique: technique || prev.technique,
          findings:
            findings?.startsWith('<')
              ? findings
              : findings?.split('\n').filter(Boolean).map((p: string) => `<p>${p}</p>`).join('') || prev.findings,
          impression:
            impression?.startsWith('<')
              ? impression
              : impression?.split('\n').filter(Boolean).map((p: string) => `<p>${p}</p>`).join('') || prev.impression,
        }));
        const msg = correctedTerms?.length
          ? `AI structured: ${correctedTerms.join(', ')}`
          : 'Report structured into standard sections.';
        setStructuredNotice(msg);
        notify.success(msg);
      }
    } catch {} finally {
      setStructuring(false);
    }
  };

  // Explicit manual version commit ("Save" button or Ctrl+S)
  const handleSave = async (newStatus?: string, milestoneTag?: string) => {
    setSaving(true);
    setSyncStatus('saving');
    try {
      const bodyPayload = buildPayload(newStatus, false, milestoneTag);
      const res = await fetch(`/api/reports/${activeReportIdRef.current || 'new'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reportId && data.reportId !== activeReportIdRef.current) {
          activeReportIdRef.current = data.reportId;
          setActiveReportId(data.reportId);
        }
        if (data.version) {
          setCurrentVersion(data.version);
        }
        if (newStatus) setReport((prev) => ({ ...prev, status: newStatus }));
        lastSavedJsonRef.current = JSON.stringify({ ...report, status: newStatus || report.status });
        setSyncStatus('saved');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSavedTime(timeStr);

        if (data.isNewVersion) {
          notify.success(`Report saved as Version ${data.version}`, {
            description: milestoneTag || `Timestamped at ${timeStr}`,
          });
        } else {
          notify.info(`Version ${data.version || currentVersion} is up to date`, {
            description: `Saved at ${timeStr}`,
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setSyncStatus('error');
        const reason = errData.error || errData.message || `Server returned HTTP ${res.status}`;
        notify.error('Failed saving report', {
          id: 'report-save-error',
          description: reason,
        });
      }
    } catch (err: any) {
      setSyncStatus('error');
      notify.error('Save failed', {
        id: 'report-save-error',
        description: err.message || 'Error occurred while saving report',
      });
    } finally {
      setSaving(false);
    }
  };

  const externalSync = useReportExternalSync({
    report,
    studyId,
    modality,
    study,
    patient,
    pgrName,
    consultantName,
    activeReportIdRef,
    setActiveReportId,
    buildPayload,
    initialGoogleDocUrl,
    setStructuredNotice,
  });

  return {
    saving,
    savedTime,
    syncStatus,
    currentVersion,
    setCurrentVersion,
    structuring,
    structuredNotice,
    setStructuredNotice,
    sendingHmis: externalSync.sendingHmis,
    submittingHmis: externalSync.submittingHmis,
    revertingHmis: externalSync.revertingHmis,
    syncingGoogleDoc: externalSync.syncingGoogleDoc,
    googleDocUrl: externalSync.googleDocUrl,
    handleStructureWithMedGemma,
    handleSave,
    handleSendToHmis: externalSync.handleSendToHmis,
    handleSubmitToHmis: externalSync.handleSubmitToHmis,
    handleRevertHmis: externalSync.handleRevertHmis,
    handleSyncGoogleDoc: externalSync.handleSyncGoogleDoc,
    activeReportId: activeReportIdRef.current || activeReportId,
  };
}
