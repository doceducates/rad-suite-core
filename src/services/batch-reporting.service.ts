/**
 * Batch Reporting Service
 * Manages multi-patient continuous dictation splitting, batch report queues, and batch HTML export.
 */
import { callAICompletion, extractJsonFromModelResponse } from './ai-router.service';
import { MULTI_PATIENT_SPLITTER_PROMPT } from './clinical-prompts.service';

export interface BatchReportItem {
  id: string;
  patientName: string;
  mrn?: string;
  studyName: string;
  modality: string;
  clinicalProfile?: string;
  technique?: string;
  findings: string;
  impression: string;
  status: 'draft' | 'structured' | 'final';
  audioFileName?: string;
  correctedTerms?: string[];
}

/**
 * Splits a continuous multi-patient audio transcript into distinct patient reports.
 */
export async function splitMultiPatientDictation(
  combinedText: string,
  defaultModality = 'CT'
): Promise<BatchReportItem[]> {
  if (!combinedText.trim()) return [];

  // 1. Try AI-powered intelligent semantic splitting
  try {
    const responseText = await callAICompletion({
      systemPrompt: MULTI_PATIENT_SPLITTER_PROMPT,
      userPrompt: `Analyze this continuous dictation and split it into separate patient reports:\n\n"${combinedText}"`,
      jsonMode: true,
      maxTokens: 2000,
      temperature: 0.1,
    });

    if (responseText) {
      const parsed = extractJsonFromModelResponse<{ reports: any[] }>(responseText);
      if (parsed?.reports && Array.isArray(parsed.reports) && parsed.reports.length > 0) {
        return parsed.reports.map((r, idx) => ({
          id: `batch-${Date.now()}-${idx}`,
          patientName: r.patientName || `Patient ${idx + 1}`,
          mrn: r.mrn || '',
          studyName: r.studyName || `${r.modality || defaultModality} Study`,
          modality: r.modality || defaultModality,
          clinicalProfile: r.clinicalProfile || '',
          technique: r.technique || 'Standard protocol.',
          findings: typeof r.findings === 'string' ? r.findings : JSON.stringify(r.findings),
          impression: typeof r.impression === 'string' ? r.impression : JSON.stringify(r.impression),
          status: 'structured',
        }));
      }
    }
  } catch {
    // Fallback to heuristic splitter
  }

  // 2. Deterministic Regex Splitter Fallback (Air-Gapped / Offline)
  return heuristicSplitMultiPatient(combinedText, defaultModality);
}

/**
 * Heuristic boundary detection for offline / rule-based patient splitting.
 */
export function heuristicSplitMultiPatient(text: string, defaultModality = 'CT'): BatchReportItem[] {
  // Regex boundary patterns
  const delimiterPattern = /(?:---|===)?\s*(?:(?:next|new|second|third|fourth|fifth)\s+patient|patient\s*#?\s*\d+|case\s*#?\s*\d+)\s*[:\-\n]/i;
  const parts = text.split(delimiterPattern).map((p) => p.trim()).filter(Boolean);

  if (parts.length <= 1) {
    return [
      {
        id: `batch-${Date.now()}-0`,
        patientName: 'Patient 1',
        studyName: `${defaultModality} Examination`,
        modality: defaultModality,
        findings: text.trim(),
        impression: 'Imaging findings documented.',
        status: 'draft',
      },
    ];
  }

  return parts.map((part, idx) => {
    // Check for impression delimiter
    const impMatch = part.match(/(?:impression|conclusion)[:\s]+([\s\S]+)/i);
    const findings = impMatch ? part.substring(0, impMatch.index).trim() : part;
    const impression = impMatch ? impMatch[1].trim() : 'Documented findings.';

    return {
      id: `batch-${Date.now()}-${idx}`,
      patientName: `Patient ${idx + 1}`,
      studyName: `${defaultModality} Study ${idx + 1}`,
      modality: defaultModality,
      findings,
      impression,
      status: 'draft',
    };
  });
}

/**
 * Generates clean, printable HTML document for the entire batch.
 */
export function generateBatchHtmlReport(reports: BatchReportItem[]): string {
  const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

  const reportsHtml = reports
    .map(
      (r, i) => `
    <div class="report-card ${i > 0 ? 'page-break' : ''}">
      <div class="header">
        <div>
          <h2>${r.studyName}</h2>
          <p class="meta">Patient: <strong>${r.patientName}</strong> ${r.mrn ? `| MRN: ${r.mrn}` : ''} | Modality: ${r.modality}</p>
        </div>
        <div class="status-badge">${r.status.toUpperCase()}</div>
      </div>
      ${r.clinicalProfile ? `<p class="clinical-profile"><em>Clinical Profile: ${r.clinicalProfile}</em></p>` : ''}
      ${r.technique ? `<p class="technique"><strong>Technique:</strong> ${r.technique}</p>` : ''}
      <div class="section-title">FINDINGS:</div>
      <div class="content">${r.findings.replace(/\n/g, '<br/>')}</div>
      <div class="section-title">IMPRESSION:</div>
      <div class="content impression-box">${r.impression.replace(/\n/g, '<br/>')}</div>
      <div class="footer">Rad Suite Automated Report | Verified on ${dateStr}</div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Batch Radiology Reports - ${dateStr}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; }
    .report-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px; }
    .page-break { page-break-before: always; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
    h2 { margin: 0; color: #0f172a; font-size: 18px; }
    .meta { margin: 4px 0 0 0; font-size: 12px; color: #64748b; }
    .status-badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; height: fit-content; }
    .section-title { font-weight: bold; font-size: 12px; color: #0284c7; margin-top: 14px; margin-bottom: 6px; letter-spacing: 0.5px; }
    .content { font-size: 13px; line-height: 1.6; color: #334155; }
    .impression-box { background: #f8fafc; border-left: 3px solid #0284c7; padding: 8px 12px; font-weight: 500; }
    .footer { margin-top: 20px; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px; text-align: right; }
    @media print { body { margin: 0; } .report-card { border: none; padding: 0; } }
  </style>
</head>
<body>
  ${reportsHtml}
</body>
</html>`;
}
