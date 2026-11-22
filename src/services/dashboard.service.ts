/**
 * Dashboard & Command Center Domain Service (Layer 2)
 * Strictly under 250 lines invariant.
 */

import { db } from '@/db';
import { reports, studies, patients, auditLog, hmisDraftVault } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getUnifiedWorklist } from '@/services/unified-case.service';
import { getClinicNodeStatusWithRelay } from '@/services/clinic-node.service';
import { getPendingCasesWithAnalytics } from './dashboard-pending.service';
import { config } from '@/lib/config';
import type { PacsStudyResult } from '@/types/pacs';
import type {
  DashboardSummaryData,
  ShiftInfo,
  ActiveDraftCase,
  DashboardKpiStats,
  ModalityCount,
  HourlyReportVolume,
  SystemNodeHealth,
  RecentActivityItem,
} from '@/types/dashboard';

export function getShiftInfo(date: Date = new Date()): ShiftInfo {
  const currentHour = date.getHours();
  const isNightShift = currentHour >= 20 || currentHour < 8;

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return {
    shiftType: isNightShift ? 'night' : 'day',
    shiftLabel: isNightShift ? 'Night Shift (20:00 - 08:00)' : 'Day Shift (08:00 - 20:00)',
    scheduleDescription: isNightShift
      ? 'Active Shift Reporting Protocol'
      : 'Clinical Diagnostic Reporting',
    isTraumaShift: false,
    activeModalityFocus: 'Diagnostic Worklist',
    currentTimeFormatted: timeFormatter.format(date),
    currentDateFormatted: dateFormatter.format(date),
  };
}

export function computeModalityDistribution(cases: PacsStudyResult[]): ModalityCount[] {
  const map: Record<string, number> = { CT: 0, MR: 0, XR: 0, US: 0, OTHER: 0 };
  let total = 0;

  for (const c of cases) {
    const raw = (c.modality || '').toUpperCase();
    if (raw === 'CT') map.CT++;
    else if (raw === 'MR' || raw === 'MRI') map.MR++;
    else if (raw === 'CR' || raw === 'DX' || raw === 'XR' || raw === 'XRAY') map.XR++;
    else if (raw === 'US') map.US++;
    else map.OTHER++;
    total++;
  }

  const colorMap: Record<string, string> = {
    MR: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    CT: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    XR: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    US: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    OTHER: 'text-secondary bg-surface-container border-outline-variant/40',
  };

  return Object.entries(map).map(([modality, count]) => ({
    modality,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    colorClass: colorMap[modality] || colorMap.OTHER,
  }));
}

export function computeHourlyCurve(reportRows: { signedAt?: string | null; createdAt?: string }[]): HourlyReportVolume[] {
  const hoursMap = new Array(24).fill(0);
  const currentHour = new Date().getHours();

  for (const r of reportRows) {
    const dateStr = r.signedAt || r.createdAt;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        hoursMap[d.getHours()]++;
      }
    }
  }

  return hoursMap.map((count, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    count,
    isCurrentHour: hour === currentHour,
  }));
}

export async function getActiveUserDraft(userId?: string): Promise<ActiveDraftCase | null> {
  try {
    const draftRows = await db
      .select({
        report: reports,
        study: studies,
        patient: patients,
      })
      .from(reports)
      .innerJoin(studies, eq(studies.id, reports.studyId))
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .where(inArray(reports.status, ['draft', 'preliminary']))
      .orderBy(desc(reports.updatedAt))
      .limit(1);

    if (!draftRows || draftRows.length === 0) return null;
    const r = draftRows[0];
    const lastEdited = new Date(r.report.updatedAt || r.report.createdAt);
    const diffMins = Math.max(0, Math.floor((Date.now() - lastEdited.getTime()) / 60000));
    const relativeTime = diffMins === 0 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;

    return {
      accessionNumber: r.study.accessionNumber,
      patientName: r.patient.fullName,
      patientMrn: r.patient.mrNumber || '',
      patientAge: r.patient.age,
      patientGender: r.patient.gender,
      modality: r.study.modality,
      studyDescription: r.study.scanType || r.study.bodyPart || 'Diagnostic Examination',
      lastEditedIso: lastEdited.toISOString(),
      lastEditedRelative: relativeTime,
      findingsPreview: (r.report.findings || '').replace(/<[^>]+>/g, '').slice(0, 140) || 'Draft in progress...',
      impressionPreview: (r.report.impression || '').replace(/<[^>]+>/g, '').slice(0, 100),
      isCritical: Boolean(r.report.criticalFinding),
    };
  } catch {
    return null;
  }
}

export async function getRecentAuditFeed(limit = 5): Promise<RecentActivityItem[]> {
  try {
    const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
    return rows.map((r) => {
      const d = new Date(r.timestamp || r.createdAt);
      const diffMins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
      const rel = diffMins === 0 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;

      let title = r.action;
      if (r.action === 'REPORT_FINALIZED') title = 'Report Finalized & Signed';
      else if (r.action === 'REPORT_DRAFT_SAVED') title = 'Draft Saved';
      else if (r.action === 'STUDY_CLAIMED') title = 'Case Claimed';
      else if (r.action === 'HMIS_SYNC_DISPATCHED') title = 'Synced to HMIS Portal';

      return {
        id: r.id,
        action: r.action,
        actionTitle: title,
        userName: r.userName || 'Clinician',
        timestamp: d.toISOString(),
        relativeTime: rel,
        entityType: r.entityType,
        entityId: r.entityId || undefined,
        isTamperEvidentValid: Boolean(r.hash && r.hash.length > 10),
      };
    });
  } catch {
    return [];
  }
}

export async function getDashboardSummary(userId?: string, isAdmin = false): Promise<DashboardSummaryData> {
  const shift = getShiftInfo();

  // Query unified hospital worklist
  const { cases, stats } = await getUnifiedWorklist({
    limit: 50,
    page: 1,
    dateRange: 'shift',
    currentUserId: userId,
  });

  // Default-Deny RBAC Invariant: Only query infrastructure node telemetry and audit trail for admins
  const [activeDraft, clinicStatus, pendingData, recentActivity] = await Promise.all([
    getActiveUserDraft(userId),
    isAdmin ? getClinicNodeStatusWithRelay().catch(() => ({ isOnline: false })) : Promise.resolve(null),
    getPendingCasesWithAnalytics(20),
    isAdmin ? getRecentAuditFeed(5) : Promise.resolve([]),
  ]);

  // Urgent triage candidates (up to 10 cases)
  const urgentTriageCases = cases
    .filter((c) => c.priority === 'stat' || (c.status !== 'final' && c.status !== 'finalized'))
    .slice(0, 10);

  // Modality mix
  const modalityDistribution = computeModalityDistribution(cases);

  // Recent completed reports for today's hourly reporting curve
  let todayReports: { signedAt?: string | null; createdAt?: string }[] = [];
  try {
    const rawReports = await db
      .select({ signedAt: reports.signedAt, createdAt: reports.createdAt })
      .from(reports)
      .where(inArray(reports.status, ['final', 'finalized', 'submitted']))
      .limit(200);
    todayReports = rawReports.map((r) => ({
      signedAt: r.signedAt ? (r.signedAt instanceof Date ? r.signedAt.toISOString() : String(r.signedAt)) : null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  } catch {}

  const hourlyReportingCurve = computeHourlyCurve(todayReports);

  // Durable draft vault count
  let vaultCount = 0;
  try {
    const vaultRows = await db.select({ id: hmisDraftVault.id }).from(hmisDraftVault).limit(200);
    vaultCount = vaultRows.length;
  } catch {}

  const kpis: DashboardKpiStats = {
    statPendingCount: stats.statCount || 0,
    urgentPendingCount: cases.filter((c) => c.priority === 'urgent').length,
    todayCompletedCount: stats.finalCount || 0,
    shiftGoalTarget: 25,
    myDraftsCount: stats.myCount || 0,
    pgrAwaitingReviewCount: stats.prelimCount || 0,
    hmisVaultSyncedCount: vaultCount,
    hmisSyncPercentage: stats.total > 0 ? Math.min(100, Math.round((vaultCount / Math.max(1, stats.total)) * 100)) : 100,
    unassignedHospitalCount: stats.unassignedCount || 0,
    totalShiftCases: stats.total || 0,
    totalPendingHoldCount: pendingData.pendingAnalytics.totalPending,
  };

  let systemHealth: SystemNodeHealth | null = null;

  if (isAdmin && clinicStatus) {
    const isClinicOnline =
      'isOnline' in clinicStatus
        ? Boolean(clinicStatus.isOnline)
        : Boolean((clinicStatus as any)?.telemetry?.isOnline);

    systemHealth = {
      hospitalPacs: {
        online: isClinicOnline,
        name: 'Hospital Core PACS (AE: PACS_SRV)',
        ip: process.env.PACS_HOST ? `${process.env.PACS_HOST}:${process.env.PACS_PORT || 104}` : '127.0.0.1:104',
        harvestStatus: isClinicOnline ? 'harvesting' : 'offline',
      },
      hmisGateway: {
        online: true,
        sessionValid: true,
        draftVaultCount: vaultCount,
        pendingQueueCount: stats.draftCount || 0,
      },
      aiEngine: {
        online: true,
        provider: 'Local Llama-Server / MedGemma',
        model: 'medgemma-4b',
        port: 8090,
      },
      storage: {
        localHotCacheMb: 1250,
        s3ArchiveOnline: true,
      },
    };
  }

  return {
    shift,
    kpis,
    activeDraft,
    urgentTriageCases,
    pendingQueue: pendingData.pendingQueue,
    pendingAnalytics: pendingData.pendingAnalytics,
    modalityDistribution,
    hourlyReportingCurve,
    systemHealth,
    recentActivity,
  };
}
