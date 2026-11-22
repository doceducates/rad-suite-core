'use client';

// Layer 4 (Presentation Hook): Remote Integrations (HMIS & Google Docs) for Worklist Report Modal
// Strict File Size Invariant: Target < 250 lines

import { useState, useCallback } from 'react';
import { clinicalTextToHtml } from '@/lib/clinical-format';
import { notify } from '@/services/notification.service';
import { isUuid, sanitizeMrn } from '@/lib/mrn-security';
import type { PacsStudyResult } from '@/types/pacs';

interface UseWorklistReportIntegrationsProps {
  study: PacsStudyResult | null;
  technique: string;
  findings: string;
  impression: string;
  history: string;
  reportId?: string;
  onEnsureReportSaved?: () => Promise<string | undefined>;
  setErrorMessage: (msg: string | null) => void;
}

export function useWorklistReportIntegrations({
  study,
  technique,
  findings,
  impression,
  history,
  reportId,
  onEnsureReportSaved,
  setErrorMessage,
}: UseWorklistReportIntegrationsProps) {
  const [sendingHmis, setSendingHmis] = useState(false);
  const [revertingHmis, setRevertingHmis] = useState(false);
  const [hmisNotice, setHmisNotice] = useState<string | null>(null);
  const [syncingGoogleDoc, setSyncingGoogleDoc] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState<string | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [submittingHmis, setSubmittingHmis] = useState(false);

  const resetNotices = useCallback(() => {
    setHmisNotice(null);
    setGoogleNotice(null);
    setGoogleDocUrl(null);
  }, []);

  const handleSendToHmis = useCallback(async (options?: { deepVerify?: boolean; dispatchCompanions?: boolean }) => {
    if (!study) return;
    const mrn = sanitizeMrn(study.patientMrn) || sanitizeMrn((study as any).mrNumber) || (!isUuid(study.patientId) ? study.patientId : '');
    if (!mrn) {
      setErrorMessage('Patient MRN is missing');
      notify.error('HMIS Error: Patient MRN is missing');
      return;
    }

    const { enqueueHmisDrafts } = await import('@/services/hmis/hmis-background-queue.service');
    const draftItems: any[] = [
      {
        studyId: study.studyId,
        accessionNumber: study.accessionNumber || 'UNKNOWN',
        patientMrn: mrn,
        patientName: study.patientName,
        scanType: study.studyDescription,
        modality: study.modality,
        bodyPart: study.bodyPart,
        hmisCpt: study.hmisCpt,
        hmisInvestigationId: study.hmisInvestigationId || (study as any).investigationId,
        technique,
        findings: clinicalTextToHtml(findings),
        impression: clinicalTextToHtml(impression),
        clinicalHistory: history,
      },
    ];

    if (options?.dispatchCompanions && Array.isArray(study.companionStudies)) {
      for (const cs of study.companionStudies) {
        if (cs.accessionNumber && cs.accessionNumber !== study.accessionNumber) {
          draftItems.push({
            studyId: (cs as any).studyId || study.studyId,
            accessionNumber: cs.accessionNumber,
            patientMrn: mrn,
            patientName: study.patientName,
            scanType: cs.studyDescription || study.studyDescription,
            modality: cs.modality || study.modality,
            bodyPart: (cs as any).bodyPart || study.bodyPart,
            hmisCpt: (cs as any).hmisCpt || study.hmisCpt,
            hmisInvestigationId: (cs as any).hmisInvestigationId || (cs as any).investigationId || study.hmisInvestigationId,
            technique,
            findings: clinicalTextToHtml(findings),
            impression: clinicalTextToHtml(impression),
            clinicalHistory: history,
          });
        }
      }
    }

    enqueueHmisDrafts(draftItems, {
      deepVerify: options?.deepVerify,
      originPath: typeof window !== 'undefined' ? window.location.pathname : '',
    });
  }, [study, technique, findings, impression, history, setErrorMessage]);

  const handleRevertHmis = useCallback(async () => {
    if (!study) return;
    setRevertingHmis(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/hmis/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientMrn: study.patientMrn || study.patientId,
          accessionNumber: study.accessionNumber,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHmisNotice('Reverted to default on HMIS portal!');
        notify.success('Reverted to default on Punjab HMIS portal!');
        setTimeout(() => setHmisNotice(null), 3500);
      } else {
        const err = data.error || 'HMIS revert failed';
        setErrorMessage(err);
        notify.error(`HMIS Revert Error: ${err}`);
      }
    } catch (err: any) {
      setErrorMessage(`HMIS Error: ${err.message}`);
      notify.error(`HMIS Error: ${err.message}`);
    } finally {
      setRevertingHmis(false);
    }
  }, [study, setErrorMessage]);

  const handleSyncGoogleDoc = useCallback(async () => {
    setSyncingGoogleDoc(true);
    setErrorMessage(null);
    try {
      let currentReportId = reportId;
      if (!currentReportId && onEnsureReportSaved) {
        currentReportId = await onEnsureReportSaved();
      }
      if (!currentReportId) {
        throw new Error('Please save report draft before syncing to Google Docs.');
      }
      const res = await fetch(`/api/reports/${currentReportId}/sync-google`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleDocUrl(data.googleDocUrl);
        setGoogleNotice('Synced to Google Docs!');
        notify.success('Report synced to Google Docs!');
        setTimeout(() => setGoogleNotice(null), 3500);
      } else {
        const err = data.error || 'Google Doc synchronization failed';
        setErrorMessage(err);
        notify.error(`Google Doc Error: ${err}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed syncing to Google Docs');
      notify.error(`Google Sync Error: ${err.message || 'Unknown'}`);
    } finally {
      setSyncingGoogleDoc(false);
    }
  }, [reportId, onEnsureReportSaved, setErrorMessage]);

  const handleSubmitFinalToHmis = useCallback(async (options?: { deepVerify?: boolean }) => {
    if (!study) return;
    const mrn = sanitizeMrn(study.patientMrn) || sanitizeMrn((study as any).mrNumber) || (!isUuid(study.patientId) ? study.patientId : '');
    if (!mrn) {
      setErrorMessage('Patient MRN is missing');
      notify.error('HMIS Error: Patient MRN is missing');
      return;
    }
    if (!findings || findings.trim().length === 0) {
      notify.warning('Please record findings before submitting report to HMIS.');
      return;
    }

    setSubmittingHmis(true);
    try {
      const res = await fetch('/api/hmis/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientMrn: mrn,
          accessionNumber: study.accessionNumber,
          scanType: study.studyDescription,
          modality: study.modality,
          bodyPart: study.bodyPart,
          hmisCpt: study.hmisCpt,
          technique,
          findings: clinicalTextToHtml(findings),
          impression: clinicalTextToHtml(impression),
          clinicalHistory: history,
          deepVerify: options?.deepVerify,
        }),
      });

      const data = await res.json();
      if (res.status === 423 || data.locked) {
        notify.warning('HMIS Final Submission is locked by safety policy.', {
          description: data.error || 'Only draft saves are currently permitted.',
        });
        return;
      }

      if (res.ok && data.success) {
        setHmisNotice('Report successfully submitted to HMIS portal!');
        notify.success('Report successfully submitted to HMIS portal!');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('radsuite:case-updated', {
              detail: { accessionNumber: study.accessionNumber, hmisStatus: 'submitted' },
            })
          );
        }
      } else {
        const err = data.error || 'Failed to submit report to HMIS';
        setErrorMessage(err);
        notify.error(`HMIS Submit Error: ${err}`);
      }
    } catch (err: any) {
      setErrorMessage(`HMIS Error: ${err.message}`);
      notify.error(`HMIS Error: ${err.message}`);
    } finally {
      setSubmittingHmis(false);
    }
  }, [study, technique, findings, impression, history, setErrorMessage]);

  return {
    sendingHmis,
    submittingHmis,
    revertingHmis,
    hmisNotice,
    syncingGoogleDoc,
    googleDocUrl,
    setGoogleDocUrl,
    googleNotice,
    resetNotices,
    handleSendToHmis,
    handleSubmitFinalToHmis,
    handleRevertHmis,
    handleSyncGoogleDoc,
  };
}
