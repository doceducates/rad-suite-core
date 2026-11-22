/**
 * Dashboard Pending Cases & Bottleneck Analytics Service (Layer 2 Domain)
 * Strictly under 250 lines invariant.
 */

import { db } from '@/db';
import { reports, studies, patients, users } from '@/db/schema';
import { eq, desc, or, isNotNull } from 'drizzle-orm';
import { formatPendingReason } from '@/lib/whatsapp-handover';
import type {
  PendingCaseItem,
  PendingAnalytics,
  PendingReasonStat,
  ConsultantPendingStat,
} from '@/types/dashboard';

const REASON_COLORS: Record<string, string> = {
  awaiting_prior_images: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  missing_history_form: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  technologist_ack_pending: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  pacs_transfer_pending: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  awaiting_lab_creatinine: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  motion_artifact_repeat: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  awaiting_clinical_history: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
  second_opinion_subspecialty: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  other: 'text-secondary bg-surface-container border-outline-variant/50',
};

export async function getPendingCasesWithAnalytics(limit = 20): Promise<{
  pendingQueue: PendingCaseItem[];
  pendingAnalytics: PendingAnalytics;
}> {
  try {
    const rows = await db
      .select({
        report: reports,
        study: studies,
        patient: patients,
        assignedUser: users,
      })
      .from(reports)
      .innerJoin(studies, eq(studies.id, reports.studyId))
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .leftJoin(users, eq(users.id, studies.assignedRadiologistId))
      .where(or(eq(reports.status, 'pending'), isNotNull(reports.pendingReason)))
      .orderBy(desc(reports.updatedAt))
      .limit(limit);

    const pendingQueue: PendingCaseItem[] = rows.map((r) => {
      const pendingDate = new Date(r.report.pendingAt || r.report.updatedAt || r.report.createdAt);
      const diffMins = Math.max(0, Math.floor((Date.now() - pendingDate.getTime()) / 60000));
      const relativeTime =
        diffMins === 0
          ? 'Just now'
          : diffMins < 60
          ? `${diffMins}m ago`
          : diffMins < 1440
          ? `${Math.floor(diffMins / 60)}h ago`
          : `${Math.floor(diffMins / 1440)}d ago`;

      const reasonKey = r.report.pendingReason || 'other';
      const consultantName =
        r.assignedUser?.name ||
        r.report.pendingBy ||
        (r.study.assignedRadiologistId ? 'Assigned Consultant' : 'Unassigned Triage');

      const patientName = (r.patient as any).fullName || (r.patient as any).name || 'Unknown Patient';
      const patientMrn = (r.patient as any).mrNumber || (r.patient as any).mrn || '';
      const studyDesc =
        (r.study as any).studyDescription ||
        (r.study as any).scanType ||
        (r.study as any).bodyPart ||
        'Diagnostic Scan';

      return {
        accessionNumber: r.study.accessionNumber,
        patientName,
        patientMrn,
        patientAge: r.patient.age,
        patientGender: r.patient.gender,
        modality: r.study.modality,
        studyDescription: studyDesc,
        pendingReason: reasonKey,
        pendingReasonLabel: formatPendingReason(reasonKey),
        pendingNotes: r.report.pendingNotes || null,
        pendingAt: pendingDate.toISOString(),
        pendingRelative: relativeTime,
        assignedConsultantName: consultantName,
        assignedConsultantId: r.study.assignedRadiologistId || null,
      };
    });

    const pendingAnalytics = computePendingAnalytics(pendingQueue);

    return {
      pendingQueue,
      pendingAnalytics,
    };
  } catch (error) {
    console.warn('[PENDING_CASES_SERVICE_WARN]', error);
    return {
      pendingQueue: [],
      pendingAnalytics: {
        totalPending: 0,
        mostCommonReason: 'None',
        highestVolumeConsultant: 'None',
        byReason: [],
        byConsultant: [],
      },
    };
  }
}

export function computePendingAnalytics(cases: PendingCaseItem[]): PendingAnalytics {
  const total = cases.length;
  if (total === 0) {
    return {
      totalPending: 0,
      mostCommonReason: 'None',
      highestVolumeConsultant: 'None',
      byReason: [],
      byConsultant: [],
    };
  }

  // 1. Group by Reason
  const reasonMap: Record<string, { label: string; count: number }> = {};
  // 2. Group by Consultant
  const consultantMap: Record<string, { consultantId: string | null; count: number }> = {};

  for (const c of cases) {
    // Reason tally
    const rKey = c.pendingReason || 'other';
    if (!reasonMap[rKey]) {
      reasonMap[rKey] = { label: c.pendingReasonLabel || formatPendingReason(rKey), count: 0 };
    }
    reasonMap[rKey].count++;

    // Consultant tally
    const cName = c.assignedConsultantName || 'Unassigned Triage';
    if (!consultantMap[cName]) {
      consultantMap[cName] = { consultantId: c.assignedConsultantId, count: 0 };
    }
    consultantMap[cName].count++;
  }

  const byReason: PendingReasonStat[] = Object.entries(reasonMap)
    .map(([reason, data]) => ({
      reason,
      label: data.label,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
      colorClass: REASON_COLORS[reason] || REASON_COLORS.other,
    }))
    .sort((a, b) => b.count - a.count);

  const byConsultant: ConsultantPendingStat[] = Object.entries(consultantMap)
    .map(([consultantName, data]) => ({
      consultantName,
      consultantId: data.consultantId,
      count: data.count,
      percentage: Math.round((data.count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPending: total,
    mostCommonReason: byReason[0]?.label || 'None',
    highestVolumeConsultant: byConsultant[0]?.consultantName || 'None',
    byReason,
    byConsultant,
  };
}
