/**
 * Safe Clipboard & Clinical Demographics Formatting Utilities
 * Multi-Platform Isolation: Handles Desktop (Tauri/Electron), Mobile (Capacitor/PWA), and Web.
 */

import {
  htmlToClinicalText,
  stripClinicalCommentMarks,
  formatFullClinicalReport,
  FullClinicalReportParams,
} from './clinical-format';

export interface PatientDemographicsSummary {
  patientName?: string;
  mrn?: string;
  patientId?: string;
  patientMrn?: string;
  accessionNumber?: string;
  accession?: string;
  age?: number | string;
  gender?: string;
  modality?: string;
  studyDescription?: string;
  studyDate?: string;
  studyTime?: string;
  dateOfBirth?: string;
  department?: string;
  clinicalHistory?: string;
}

/**
 * Copies arbitrary text safely to the system clipboard.
 * Supports modern Clipboard API with fallback to execCommand('copy') for webviews & insecure contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || typeof text !== 'string') return false;

  // Modern Clipboard API
  const nav = typeof navigator !== 'undefined' ? navigator : (typeof window !== 'undefined' ? window.navigator : undefined);
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy fallback
    }
  }

  // Fallback for restricted contexts (iframes, webviews, non-HTTPS LAN)
  if (typeof document !== 'undefined') {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.top = '-9999px';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      return Boolean(success);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return false;
    }
  }

  return false;
}

/**
 * Copies rich HTML along with a plain-text fallback to the system clipboard.
 * Preserves headings, bolding, lists, and indentation when pasted into rich editors (TinyMCE, Word, Docs).
 */
export async function copyRichHtmlToClipboard(html: string, fallbackPlainText?: string): Promise<boolean> {
  if (!html || typeof html !== 'string') return false;
  const cleanHtml = stripClinicalCommentMarks(html);
  const plainText = fallbackPlainText || htmlToClinicalText(cleanHtml);

  const nav = typeof navigator !== 'undefined' ? navigator : (typeof window !== 'undefined' ? window.navigator : undefined);
  if (nav?.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const htmlBlob = new Blob([cleanHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await nav.clipboard.write([item]);
      return true;
    } catch {
      // Fallback to plain text copy if write([ClipboardItem]) fails or is restricted
    }
  }

  return copyToClipboard(plainText);
}

/**
 * Formats full patient and study demographics into a clean, readable text block.
 */
export function formatPatientSummary(data: PatientDemographicsSummary): string {
  const lines: string[] = [];

  if (data.patientName?.trim()) {
    lines.push(`Patient: ${data.patientName.trim()}`);
  }

  const ageStr = data.age && data.age !== '0' && data.age !== 0 ? `${data.age}y` : '';
  const genderStr = data.gender?.trim() || '';
  if (ageStr || genderStr) {
    lines.push(`Age/Gender: ${[ageStr, genderStr].filter(Boolean).join(' / ')}`);
  }

  const mrn = (data.mrn || data.patientId || data.patientMrn)?.trim();
  if (mrn) {
    lines.push(`MRN: ${mrn}`);
  }

  const acc = (data.accessionNumber || data.accession)?.trim();
  if (acc) {
    lines.push(`Accession: ${acc}`);
  }

  if (data.modality?.trim()) {
    lines.push(`Modality: ${data.modality.trim()}`);
  }

  if (data.studyDescription?.trim()) {
    lines.push(`Study: ${data.studyDescription.trim()}`);
  }

  if (data.department?.trim()) {
    lines.push(`Department: ${data.department.trim()}`);
  }

  if (data.studyDate?.trim()) {
    const dateTime = data.studyTime ? `${data.studyDate.trim()} ${data.studyTime.trim()}` : data.studyDate.trim();
    lines.push(`Date: ${dateTime}`);
  }

  if (data.dateOfBirth?.trim()) {
    lines.push(`DOB: ${data.dateOfBirth.trim()}`);
  }

  if (data.clinicalHistory?.trim()) {
    lines.push(`History: ${data.clinicalHistory.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Strips HTML if needed and copies a single report section (Findings, Impression, History, Technique).
 */
export async function copyReportSection(content: string, isHtml = false): Promise<boolean> {
  const text = isHtml ? htmlToClinicalText(content) : content.trim();
  return copyToClipboard(text);
}

/**
 * Copies a fully formatted clinical radiology report.
 */
export async function copyFullReport(params: FullClinicalReportParams): Promise<boolean> {
  const text = formatFullClinicalReport(params);
  return copyToClipboard(text);
}
