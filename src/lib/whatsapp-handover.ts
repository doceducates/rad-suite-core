import type { PacsStudyResult } from '@/types/pacs';
import { extractDiagnosisHighlight } from '@/lib/clinical-summary';
import {
  HandoverFieldsConfig,
  DEFAULT_HANDOVER_FIELDS,
  SIMPLE_HANDOVER_FIELDS,
} from './whatsapp-handover-fields';
import {
  formatClinicalStatus,
  formatPendingReason,
  normalizeWhatsappPhone,
  checkCasePending,
  PENDING_REASON_LABELS,
} from './whatsapp-handover-status';

export type { HandoverFieldsConfig };
export {
  DEFAULT_HANDOVER_FIELDS,
  SIMPLE_HANDOVER_FIELDS,
  formatClinicalStatus,
  formatPendingReason,
  normalizeWhatsappPhone,
  checkCasePending,
  PENDING_REASON_LABELS,
};

export interface HandoverOptions extends Partial<HandoverFieldsConfig> {
  doctorName?: string;
  seniorName?: string;
  customNote?: string;
  hospitalName?: string;
  brandingTitle?: string;
  classDate?: string;
}

/**
 * Formats a list of diagnostic cases into a clean WhatsApp Markdown message
 * suitable for clinical handover or requesting senior consultant verification.
 */
export function formatWhatsappHandover(cases: PacsStudyResult[], options: HandoverOptions = {}): string {
  if (!cases || cases.length === 0) return '';

  const {
    doctorName,
    seniorName,
    customNote,
    hospitalName,
    brandingTitle = 'Rad Suite Core — Clinical Case Review / Handover',
    classDate,
  } = options;

  const includeBranding = options.includeBranding !== false;
  const includeConsultant = options.includeConsultant !== false;
  const includeResident = options.includeResident !== false;
  const includeDate = options.includeDate !== false;
  const includeTotalCases = options.includeTotalCases !== undefined
    ? options.includeTotalCases !== false
    : (options.includeSummaryCount !== undefined ? options.includeSummaryCount !== false : true);
  const includeTotalStudies = options.includeTotalStudies !== undefined
    ? options.includeTotalStudies !== false
    : (options.includeSummaryCount !== undefined ? options.includeSummaryCount !== false : true);

  const includePatientName = options.includePatientName !== false;
  const includeAccession = options.includeAccession !== false;
  const includeStatus = options.includeStatus !== false;
  const includeAgeGender = options.includeAgeGender !== false;
  const includeModalityExam = options.includeModalityExam !== false;
  const includeMrn = options.includeMrn !== false;
  const includeDiagnosisHighlights = Boolean(options.includeDiagnosisHighlights);
  const includeDepartment = options.includeDepartment !== false;
  const includePriorityAlerts = options.includePriorityAlerts !== false;
  const includePortalReminder = options.includePortalReminder !== false;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let displayDateStr = `${dateStr}, ${timeStr}`;
  let datePrefix = 'Date';

  if (classDate && classDate.trim()) {
    try {
      const parts = classDate.trim().split(/[-/]/);
      let dObj: Date | null = null;
      if (parts.length === 3 && parts[0].length === 4) {
        dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else if (parts.length === 3 && parts[2].length === 4) {
        dObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        dObj = new Date(classDate);
      }
      if (dObj && !isNaN(dObj.getTime())) {
        displayDateStr = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        datePrefix = 'Class Date';
      }
    } catch {}
  }

  const lines: string[] = [];

  // Identify pending cases for the summary overview
  const pendingCasesInfo = cases
    .map((c) => ({ study: c, ...checkCasePending(c) }))
    .filter((ci) => ci.isPending);

  // Header
  let hasHeaderContent = false;
  if (includeBranding) {
    lines.push(`🏥 *${brandingTitle}*`);
    hasHeaderContent = true;
  }
  if (hospitalName) {
    lines.push(`🏢 *Hospital:* ${hospitalName}`);
    hasHeaderContent = true;
  }
  if (includeConsultant && seniorName) {
    lines.push(`👨‍⚕️ *Consultant:* ${seniorName}`);
    hasHeaderContent = true;
  }
  if (includeResident && doctorName) {
    lines.push(`🩺 *Resident:* ${doctorName}`);
    hasHeaderContent = true;
  }
  if (includeDate) {
    lines.push(`📅 *${datePrefix}:* ${displayDateStr}`);
    hasHeaderContent = true;
  }

  // Summary Case & Study Counts & Pending Breakdown
  const totalStudies = cases.reduce((acc, c) => {
    return acc + (c.studies && c.studies.length > 0 ? c.studies.length : 1);
  }, 0);

  const showSummaryCounts = includeTotalCases || includeTotalStudies;
  if (showSummaryCounts) {
    const activeCount = cases.length - pendingCasesInfo.length;
    const pendingCount = pendingCasesInfo.length;
    const pendingSuffix = pendingCount > 0
      ? ` (${activeCount > 0 ? `${activeCount} Active, ` : ''}${pendingCount} Pending)`
      : '';

    if (includeTotalCases && includeTotalStudies) {
      lines.push(`📊 *Cases:* ${cases.length} | *Studies:* ${totalStudies}${pendingSuffix}`);
    } else if (includeTotalCases) {
      lines.push(`📊 *Cases:* ${cases.length}${pendingSuffix}`);
    } else if (includeTotalStudies) {
      lines.push(`📊 *Studies:* ${totalStudies}${pendingSuffix}`);
    }

    if (pendingCount > 0) {
      lines.push(`⚠️ *Pending Cases Breakdown (${pendingCount}):*`);
      pendingCasesInfo.forEach((pi) => {
        const name = pi.study.patientName || 'Unknown Patient';
        const acc = pi.study.accessionNumber ? `\`${pi.study.accessionNumber}\`` : (pi.study.patientMrn ? `\`${pi.study.patientMrn}\`` : '');
        const noteStr = pi.notes ? ` — "${pi.notes}"` : '';
        lines.push(`   • ${name}${acc ? ` (${acc})` : ''}: ${pi.reason}${noteStr}`);
      });
    }
    hasHeaderContent = true;
  }

  if (hasHeaderContent) {
    lines.push('');
  }

  // Cases List
  cases.forEach((c, idx) => {
    const num = idx + 1;
    const name = c.patientName || 'Unknown Patient';
    const ageStr = c.age && c.age > 0 ? `${c.age}y` : undefined;
    const ageSex = includeAgeGender ? [ageStr, c.gender].filter(Boolean).join(' / ') : undefined;
    
    let headerTitle = includePatientName ? name : `Case ${num}`;
    if (ageSex) {
      headerTitle = `${headerTitle} (${ageSex})`;
    }
    const pendingInfo = checkCasePending(c);

    lines.push(`*${num}. ${headerTitle}*`);

    if (includeMrn && (c.patientMrn || c.patientId)) {
      lines.push(`   • *MRN:* \`${c.patientMrn || c.patientId}\``);
    }

    if (c.studies && c.studies.length > 1) {
      lines.push(`   • *Studies Ordered (${c.studies.length}):*`);
      c.studies.forEach((s, sIdx) => {
        const sDesc = s.studyDescription || s.modality || 'Diagnostic Study';
        const sPendingInfo = checkCasePending(s);
        const sStatus = sPendingInfo.isPending
          ? formatClinicalStatus('pending', s.hmisStatus, sPendingInfo.reason)
          : formatClinicalStatus(s.status, s.hmisStatus);

        const sAcc = includeAccession && s.accessionNumber ? `\`${s.accessionNumber}\`` : '';
        const sExam = includeModalityExam ? `[${s.modality}] ${sDesc}` : '';
        const sSt = includeStatus ? sStatus : '';

        let studyLine = `${sIdx + 1}. `;
        if (sAcc && sExam) {
          studyLine += `${sAcc} — ${sExam}`;
        } else if (sAcc) {
          studyLine += sAcc;
        } else if (sExam) {
          studyLine += sExam;
        }

        if (sSt) {
          studyLine += (sAcc || sExam) ? ` • ${sSt}` : sSt;
        }

        lines.push(`     ${studyLine}`);

        if (includeStatus && sPendingInfo.isPending && sPendingInfo.notes) {
          lines.push(`        📝 *Pending Notes:* ${sPendingInfo.notes}`);
        }
        if (includeDiagnosisHighlights) {
          const sHighlight = s.diagnosisHighlight || (s.impression ? extractDiagnosisHighlight(s.impression) : undefined);
          if (sHighlight) {
            lines.push(`        🎯 *Key Diagnosis:* ${sHighlight}`);
          }
        }
      });
    } else {
      if (includeAccession && c.accessionNumber) {
        lines.push(`   • *Accession:* \`${c.accessionNumber}\``);
      }
      if (includeModalityExam) {
        const examDesc = c.studyDescription || c.modality || 'Diagnostic Study';
        lines.push(`   • *Modality / Exam:* ${c.modality ? `[${c.modality}] ` : ''}${examDesc}`);
      }
    }

    if (includeDepartment && c.department) {
      lines.push(`   • *Dept:* ${c.department}`);
    }

    if (includeStatus) {
      const statusLabel = pendingInfo.isPending
        ? formatClinicalStatus('pending', c.hmisStatus, pendingInfo.reason)
        : formatClinicalStatus(c.status, c.hmisStatus);
      lines.push(`   • *Status:* ${statusLabel}`);

      if (pendingInfo.isPending && pendingInfo.notes) {
        lines.push(`   • 📝 *Pending Notes:* ${pendingInfo.notes}`);
      }
    }

    if (includePriorityAlerts) {
      if (c.priority === 'stat') {
        lines.push('   • 🚨 *Priority:* STAT / Urgent');
      }

      if (c.criticalFinding) {
        lines.push('   • ⚠️ *Alert:* Critical Finding Present');
      }
    }

    if (includeDiagnosisHighlights) {
      const highlight =
        c.diagnosisHighlight || (c.impression ? extractDiagnosisHighlight(c.impression) : undefined);
      if (highlight) {
        lines.push(`   • 🎯 *Key Diagnosis:* ${highlight}`);
      }
    }

    lines.push('');
  });

  if (customNote && customNote.trim()) {
    lines.push(`💬 *Note:* ${customNote.trim()}`);
    lines.push('');
  }

  if (includePortalReminder) {
    lines.push('_Please review and verify on HMIS Portal._');
  }

  return lines.join('\n').trim();
}

/**
 * Returns a universal WhatsApp web/app share URL with encoded message
 */
export function getWhatsappShareUrl(text: string, phone?: string): string {
  const encoded = encodeURIComponent(text);
  if (phone && phone.trim()) {
    const normalized = normalizeWhatsappPhone(phone.trim());
    return `https://api.whatsapp.com/send?phone=${normalized}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}
