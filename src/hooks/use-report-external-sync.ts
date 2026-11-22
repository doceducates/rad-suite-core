'use client';

import { useState } from 'react';
import { notify } from '@/services/notification.service';
import { extractSafeMrn } from '@/lib/mrn-security';
import type { ReportEditorState } from './use-report-editor-actions';

interface UseReportExternalSyncProps {
  report: ReportEditorState;
  studyId: string;
  modality: string;
  study?: any;
  patient?: any;
  pgrName: string;
  consultantName: string;
  activeReportIdRef: React.MutableRefObject<string | undefined>;
  setActiveReportId: (id: string | undefined) => void;
  buildPayload: (extraStatus?: string) => any;
  initialGoogleDocUrl?: string;
  setStructuredNotice: (notice: string | null) => void;
}

export function useReportExternalSync({
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
}: UseReportExternalSyncProps) {
  const [sendingHmis, setSendingHmis] = useState(false);
  const [revertingHmis, setRevertingHmis] = useState(false);
  const [syncingGoogleDoc, setSyncingGoogleDoc] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState<string | null>(initialGoogleDocUrl || null);

  const handleSendToHmis = async (options?: { deepVerify?: boolean; dispatchCompanions?: boolean }) => {
    const mrn = extractSafeMrn(patient, study);
    const accession = study?.accessionNumber;
    if (!mrn) {
      const err = 'HMIS Error: Valid Patient MRN is missing';
      setStructuredNotice(err);
      notify.error(err);
      return;
    }
    if (!report.findings || report.findings.trim().length === 0) {
      notify.warning('Please record findings before saving draft to HMIS.');
      return;
    }

    setSendingHmis(true);
    import('@/services/hmis/hmis-background-queue.service')
      .then(({ enqueueHmisDrafts }) => {
        const draftItems: any[] = [
          {
            studyId,
            accessionNumber: accession || 'UNKNOWN',
            patientMrn: mrn,
            patientName: patient?.fullName || patient?.name || study?.patientName,
            scanType: study?.scanType || study?.studyDescription,
            modality: study?.modality || modality,
            bodyPart: study?.bodyPart,
            hmisCpt: study?.hmisCpt,
            hmisInvestigationId: study?.hmisInvestigationId || (study as any)?.investigationId,
            technique: report.technique,
            findings: report.findings,
            impression: report.impression,
            clinicalHistory: report.clinicalHistory || study?.clinicalHistory,
          },
        ];

        if (options?.dispatchCompanions && Array.isArray(study?.companionStudies)) {
          for (const cs of study.companionStudies) {
            if (cs.accessionNumber && cs.accessionNumber !== accession) {
              draftItems.push({
                studyId: cs.studyId,
                accessionNumber: cs.accessionNumber,
                patientMrn: mrn,
                patientName: patient?.fullName || patient?.name || study?.patientName,
                scanType: cs.studyDescription || study?.studyDescription,
                modality: cs.modality || study?.modality || modality,
                bodyPart: cs.bodyPart || study?.bodyPart,
                hmisCpt: cs.hmisCpt,
                hmisInvestigationId: cs.hmisInvestigationId || (cs as any)?.investigationId,
                technique: report.technique,
                findings: report.findings,
                impression: report.impression,
                clinicalHistory: report.clinicalHistory || study?.clinicalHistory,
              });
            }
          }
        }

        enqueueHmisDrafts(draftItems, {
          doctorName: pgrName,
          deepVerify: options?.deepVerify,
          originPath: typeof window !== 'undefined' ? window.location.pathname : '',
          onComplete: () => {
            setSendingHmis(false);
          },
        });
      })
      .catch(() => {
        setSendingHmis(false);
      });
  };

  const handleRevertHmis = async () => {
    const mrn = patient?.mrNumber || patient?.mrn || study?.patientMrn || study?.mrNumber || study?.mrn || (study?.patientId && !study.patientId.includes('-') ? study.patientId : '');
    const accession = study?.accessionNumber;
    if (!mrn) {
      setStructuredNotice('HMIS Error: Valid Patient MRN is missing');
      return;
    }

    setRevertingHmis(true);
    setStructuredNotice(null);
    try {
      const res = await fetch('/api/hmis/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientMrn: mrn, accessionNumber: accession }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const msg = 'Patient draft reverted to default template on HMIS portal.';
        setStructuredNotice(msg);
        notify.success(msg);
      } else {
        const err = `HMIS Revert Error: ${data.error || 'Failed to revert'}`;
        setStructuredNotice(err);
        notify.error(err);
      }
    } catch (err: any) {
      const errMsg = `HMIS Revert Error: ${err.message}`;
      setStructuredNotice(errMsg);
      notify.error(errMsg);
    } finally {
      setRevertingHmis(false);
    }
  };

  const handleSyncGoogleDoc = async () => {
    setSyncingGoogleDoc(true);
    setStructuredNotice(null);
    try {
      let currentReportId = activeReportIdRef.current;
      if (!currentReportId) {
        const payload = buildPayload();
        const saveRes = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const saveData = await saveRes.json();
        if (saveRes.ok && saveData.reportId) {
          currentReportId = saveData.reportId;
          activeReportIdRef.current = currentReportId;
          setActiveReportId(currentReportId);
        } else {
          throw new Error(saveData.error || 'Failed to save report before Google Doc sync');
        }
      }

      const res = await fetch(`/api/reports/${currentReportId}/sync-google`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleDocUrl(data.googleDocUrl);
        const msg = 'Report successfully synchronized to Google Docs!';
        setStructuredNotice(msg);
        notify.success(msg);
      } else {
        const err = `Google Doc Error: ${data.error || 'Sync failed'}`;
        setStructuredNotice(err);
        notify.error(err);
      }
    } catch (err: any) {
      const errMsg = `Google Doc Error: ${err.message}`;
      setStructuredNotice(errMsg);
      notify.error(errMsg);
    } finally {
      setSyncingGoogleDoc(false);
    }
  };

  const [submittingHmis, setSubmittingHmis] = useState(false);

  const handleSubmitToHmis = async (options?: { deepVerify?: boolean }) => {
    const mrn = extractSafeMrn(patient, study);
    const accession = study?.accessionNumber;
    if (!mrn) {
      notify.error('HMIS Error: Valid Patient MRN is missing');
      return;
    }
    if (!report.findings || report.findings.trim().length === 0) {
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
          patientName: patient?.fullName || patient?.name || study?.patientName,
          accessionNumber: accession,
          scanType: study?.scanType || study?.studyDescription,
          modality: study?.modality || modality,
          bodyPart: study?.bodyPart,
          hmisCpt: study?.hmisCpt,
          technique: report.technique,
          findings: report.findings,
          impression: report.impression,
          clinicalHistory: report.clinicalHistory || study?.clinicalHistory,
          pgrName,
          consultantName,
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
        notify.success('Report successfully submitted to HMIS portal!');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('radsuite:case-updated', {
              detail: { accessionNumber: accession, hmisStatus: 'submitted' },
            })
          );
        }
      } else {
        notify.error('HMIS Submission Failed', data.error || 'Gateway rejected submission');
      }
    } catch (err: any) {
      notify.error('HMIS Submit Error', err.message);
    } finally {
      setSubmittingHmis(false);
    }
  };

  return {
    sendingHmis,
    submittingHmis,
    revertingHmis,
    syncingGoogleDoc,
    googleDocUrl,
    handleSendToHmis,
    handleSubmitToHmis,
    handleRevertHmis,
    handleSyncGoogleDoc,
  };
}
