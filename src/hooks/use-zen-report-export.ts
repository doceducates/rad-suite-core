'use client';

import { useState, useCallback } from 'react';
import { downloadReportFile } from '@/services/report-download.service';
import type { ReportEditorState } from '@/hooks/use-report-editor-actions';

export interface UseZenReportExportParams {
  report: ReportEditorState;
  studyId?: string;
  reportId?: string;
  modality?: string;
  studyDescription?: string;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientMrn?: string;
  accessionNumber?: string;
  pgrName?: string;
  consultantName?: string;
}

export function useZenReportExport(params: UseZenReportExportParams) {
  const [isExporting, setIsExporting] = useState(false);

  const triggerExport = useCallback(
    async (format: 'pdf' | 'docx') => {
      if (isExporting) return;
      setIsExporting(true);
      try {
        await downloadReportFile({
          format,
          reportId: params.reportId || params.studyId,
          studyId: params.studyId,
          accessionNumber: params.accessionNumber,
          patientName: params.patientName || 'Patient',
          patientMrn: params.patientMrn,
          patientAge: params.patientAge,
          patientGender: params.patientGender,
          modality: params.modality || 'CT',
          studyDescription: params.studyDescription,
          clinicalHistory: params.report.clinicalHistory,
          technique: params.report.technique,
          findings: params.report.findings,
          impression: params.report.impression,
          pgrName: params.pgrName,
          consultantName: params.consultantName,
        });
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, params]
  );

  const handleExportPdf = useCallback(() => triggerExport('pdf'), [triggerExport]);
  const handleExportDocx = useCallback(() => triggerExport('docx'), [triggerExport]);

  return {
    handleExportPdf,
    handleExportDocx,
    isExporting,
  };
}
