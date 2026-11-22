'use client';

import { useState } from 'react';
import { notify } from '@/services/notification.service';
import type { ReportEditorState } from '@/hooks/use-report-editor-actions';

export interface UseQuickPolishReportParams {
  report: ReportEditorState;
  setReport: React.Dispatch<React.SetStateAction<ReportEditorState>>;
  setTemplateRev: React.Dispatch<React.SetStateAction<number>>;
  modality?: string;
  studyDescription?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientName?: string;
  pgrName?: string;
  reportStyle?: string;
  impressionStyle?: string;
  consultantNotes?: string;
}

export function useQuickPolishReport({
  report,
  setReport,
  setTemplateRev,
  modality,
  studyDescription,
  patientAge,
  patientGender,
  patientName,
  pgrName,
  reportStyle = 'categorized',
  impressionStyle = 'local_high_yield',
  consultantNotes,
}: UseQuickPolishReportParams) {
  const [isPolishingWholeReport, setIsPolishingWholeReport] = useState(false);
  const [polishNotice, setPolishNotice] = useState<string | null>(null);

  const handleQuickPolishWholeReport = async (overrideParams?: {
    findings?: string;
    consultantNotes?: string;
    reportStyle?: string;
    impressionStyle?: string;
  }) => {
    if (isPolishingWholeReport) return;
    const effectiveFindings = overrideParams?.findings || report.findings || '';
    const plainFindings = effectiveFindings.replace(/<[^>]*>/g, '').trim();
    if (!plainFindings) {
      setPolishNotice('⚠️ Please enter or dictate findings first before polishing.');
      setTimeout(() => setPolishNotice(null), 4000);
      return;
    }

    try {
      setIsPolishingWholeReport(true);
      setPolishNotice('✨ Synthesizing & polishing report with AI...');
      const res = await fetch('/api/ai/polish-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalHistory: report.clinicalHistory,
          technique: report.technique,
          findings: effectiveFindings,
          impression: report.impression,
          modality,
          studyDescription,
          patientAge: patientAge !== undefined && patientAge !== null ? String(patientAge) : undefined,
          patientGender,
          patientName,
          radiologistName: pgrName,
          reportStyle: overrideParams?.reportStyle || reportStyle,
          impressionStyle: overrideParams?.impressionStyle || impressionStyle,
          consultantNotes: overrideParams?.consultantNotes || consultantNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReport((prev) => ({
          ...prev,
          clinicalHistory: data.clinicalHistory ?? prev.clinicalHistory,
          technique: data.technique ?? prev.technique,
          findings: data.findings ?? prev.findings,
          impression: data.impression ?? prev.impression,
        }));
        setTemplateRev((r) => r + 1);
        setPolishNotice('✓ Report polished successfully into structured format!');
        notify.success('Report polished successfully into structured format!');
        setTimeout(() => setPolishNotice(null), 4000);
      } else {
        const err = data.error || 'Server error';
        setPolishNotice(`⚠️ Polish failed: ${err}`);
        notify.error(`Polish failed: ${err}`);
        setTimeout(() => setPolishNotice(null), 6000);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Connection error';
      setPolishNotice(`⚠️ Polish failed: ${errMsg}`);
      notify.error(`Polish failed: ${errMsg}`);
      setTimeout(() => setPolishNotice(null), 6000);
    } finally {
      setIsPolishingWholeReport(false);
    }
  };

  return {
    isPolishingWholeReport,
    polishNotice,
    handleQuickPolishWholeReport,
  };
}
