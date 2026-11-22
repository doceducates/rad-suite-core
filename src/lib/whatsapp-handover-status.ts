// Layer 2 (Domain/Services): WhatsApp Handover Clinical Status & Pending Helpers
// Strict File Size Invariant: Target < 150 lines

import type { PacsStudyResult } from '@/types/pacs';

/**
 * Predefined clinical labels for structured pending / hold reasons
 */
export const PENDING_REASON_LABELS: Record<string, string> = {
  awaiting_prior_images: 'Awaiting Prior Comparison Films',
  missing_history_form: 'Missing Paper History Form / Record',
  technologist_ack_pending: 'Technologist Ack Pending / HMIS Issue',
  pacs_transfer_pending: 'PACS Imaging Missing / Incomplete',
  awaiting_lab_creatinine: 'Awaiting Renal Profile / Creatinine',
  motion_artifact_repeat: 'Poor Image Quality / Motion Artifact',
  awaiting_clinical_history: 'Awaiting Referring Clinical Indication',
  second_opinion_subspecialty: 'Subspecialty / MDT Review',
  study_case: 'Study Case / Academic Interest',
  other: 'Other Clinical Reason',
};

export function formatPendingReason(reason?: string | null): string {
  if (!reason) return '';
  return PENDING_REASON_LABELS[reason] || reason;
}

/**
 * Normalizes phone numbers, specifically handling Pakistani formats (0300xxxxxxx -> 92300xxxxxxx)
 */
export function normalizeWhatsappPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned.slice(1);
  }
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    return '92' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Formats raw workstation or HMIS status into standardized clinical badge text
 */
export function formatClinicalStatus(
  status?: string,
  hmisStatus?: string | null,
  pendingReason?: string | null
): string {
  const st = (status || hmisStatus || 'scheduled').toLowerCase();
  if (st === 'final' || st === 'finalized' || st === 'verified') return '✅ Verified & Published';
  if (st === 'submitted') return '📤 Submitted to HMIS';
  if (st === 'reported') return '📄 Reported (Needs Verification)';
  if (st === 'preliminary') return '🎙️ PGR Preliminary';
  if (st === 'draft' || st === 'in-progress' || st === 'typing') return '📝 Draft';
  if (st === 'pending') {
    const reasonText = formatPendingReason(pendingReason);
    return reasonText ? `⚠️ Pending — ${reasonText}` : '⚠️ Pending';
  }
  if (st === 'amended') return '🔄 Amended';
  if (st === 'scheduled' || st === 'awaiting_report') return '⏳ Awaiting Report';
  return st.charAt(0).toUpperCase() + st.slice(1);
}

export function checkCasePending(c: PacsStudyResult): { isPending: boolean; reason: string; notes?: string } {
  const isPending =
    (c.status || '').toLowerCase() === 'pending' ||
    Boolean(c.pendingReason) ||
    Boolean(c.studies?.some((s) => (s.status || '').toLowerCase() === 'pending' || Boolean(s.pendingReason)));

  let reason = formatPendingReason(c.pendingReason);
  let notes = c.pendingNotes?.trim();

  if (!reason && c.studies) {
    const childPending = c.studies.find(
      (s) => (s.status || '').toLowerCase() === 'pending' || Boolean(s.pendingReason)
    );
    if (childPending) {
      reason = formatPendingReason(childPending.pendingReason);
      notes = childPending.pendingNotes?.trim();
    }
  }

  return {
    isPending,
    reason: reason || 'Clinical / Technical Hold',
    notes,
  };
}
