// Layer 2/4 Helper: Isolated Worklist Report Persistence
import { htmlToClinicalText, clinicalTextToHtml, formatFullClinicalReport } from '@/lib/clinical-format';
import { findBestTemplateForStudy } from './worklist-templates';
import { copyToClipboard } from '@/lib/clipboard';
import type { PacsStudyResult } from '@/types/pacs';
import type { ReportStatus } from '@/types';

interface SaveReportParams {
  reportId?: string;
  study: PacsStudyResult;
  history: string;
  technique: string;
  findings: string;
  impression: string;
  status: ReportStatus;
  criticalFinding: boolean;
}

export async function saveWorklistReportPayload({
  reportId,
  study,
  history,
  technique,
  findings,
  impression,
  status,
  criticalFinding,
}: SaveReportParams): Promise<{ reportId: string }> {
  const rawG = String(study.gender || '').trim().toUpperCase();
  const normalizedGender =
    rawG === 'M' || rawG === 'MALE'
      ? 'Male'
      : rawG === 'F' || rawG === 'FEMALE'
      ? 'Female'
      : rawG === 'OTHER'
      ? 'Other'
      : undefined;

  const rawAge = study.age;
  const normalizedAge =
    rawAge !== undefined && rawAge !== null && !isNaN(Number(rawAge))
      ? Math.round(Number(rawAge))
      : undefined;

  const res = await fetch(`/api/reports/${reportId || 'new'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reportId,
      studyId: study.studyId,
      accessionNumber: study.accessionNumber,
      patientMrn: study.patientMrn || study.patientId,
      patientName: study.patientName,
      age: normalizedAge,
      gender: normalizedGender,
      modality: study.modality,
      studyDescription: study.studyDescription,
      clinicalHistory: history,
      technique,
      findings: clinicalTextToHtml(findings),
      impression: clinicalTextToHtml(impression),
      status,
      criticalFinding,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed saving report');
  }

  return { reportId: data.reportId };
}

export async function fetchWorklistReportData(targetStudy: PacsStudyResult) {
  const q = targetStudy.studyId || targetStudy.accessionNumber;
  const res = await fetch(`/api/reports?studyId=${encodeURIComponent(q)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.report || null;
}

export async function loadInitialWorklistReport(targetStudy: PacsStudyResult) {
  const rep = await fetchWorklistReportData(targetStudy);
  if (!rep) return null;

  const rawFindings = htmlToClinicalText(rep.findings);
  const rawImpression = htmlToClinicalText(rep.impression);
  let findings = rawFindings;
  let findingsHtml = rep.findings || '';
  let impression = rawImpression;
  let impressionHtml = rep.impression || '';
  let technique = rep.technique || `${targetStudy.modality} examination performed according to standard protocol.`;

  if (!rawFindings.trim()) {
    const bestTpl = findBestTemplateForStudy(targetStudy.modality, targetStudy.studyDescription);
    if (bestTpl) {
      if (!rep.technique && bestTpl.template.technique) technique = bestTpl.template.technique;
      findings = bestTpl.template.findings;
      impression = bestTpl.template.impression;
      findingsHtml = clinicalTextToHtml(bestTpl.template.findings);
      impressionHtml = clinicalTextToHtml(bestTpl.template.impression);
    }
  }

  return {
    id: rep.id,
    history: rep.clinicalHistory || '',
    technique,
    findings,
    findingsHtml,
    impression,
    impressionHtml,
    status: rep.status || 'draft',
    criticalFinding: Boolean(rep.criticalFinding),
    googleDocUrl: rep.googleDocUrl || null,
  };
}

export async function copyFullReportText(params: Parameters<typeof formatFullClinicalReport>[0]): Promise<boolean> {
  const reportText = formatFullClinicalReport(params);
  return copyToClipboard(reportText);
}
