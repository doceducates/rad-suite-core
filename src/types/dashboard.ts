/**
 * Dashboard & Command Center Types
 * Strictly under 250 lines invariant.
 */

import type { PacsStudyResult } from '@/types/pacs';

export interface ShiftInfo {
  shiftType: 'day' | 'night';
  shiftLabel: string;
  scheduleDescription: string;
  isTraumaShift: boolean;
  activeModalityFocus: string;
  currentTimeFormatted: string;
  currentDateFormatted: string;
}

export interface ActiveDraftCase {
  accessionNumber: string;
  patientName: string;
  patientMrn: string;
  patientAge?: string | number | null;
  patientGender?: string | null;
  modality: string;
  studyDescription: string;
  lastEditedIso: string;
  lastEditedRelative: string;
  findingsPreview: string;
  impressionPreview?: string;
  isCritical?: boolean;
}

export interface DashboardKpiStats {
  statPendingCount: number;
  urgentPendingCount: number;
  todayCompletedCount: number;
  shiftGoalTarget: number;
  myDraftsCount: number;
  pgrAwaitingReviewCount: number;
  hmisVaultSyncedCount: number;
  hmisSyncPercentage: number;
  unassignedHospitalCount: number;
  totalShiftCases: number;
  totalPendingHoldCount: number;
}

export interface ModalityCount {
  modality: string;
  count: number;
  percentage: number;
  colorClass: string;
}

export interface HourlyReportVolume {
  hour: number;
  label: string;
  count: number;
  isCurrentHour: boolean;
}

export interface SystemNodeHealth {
  hospitalPacs: {
    online: boolean;
    name: string;
    ip: string;
    lastPingMs?: number;
    harvestStatus: 'harvesting' | 'idle' | 'offline';
  };
  hmisGateway: {
    online: boolean;
    sessionValid: boolean;
    draftVaultCount: number;
    pendingQueueCount: number;
  };
  aiEngine: {
    online: boolean;
    provider: string;
    model: string;
    port: number;
  };
  storage: {
    localHotCacheMb: number;
    s3ArchiveOnline: boolean;
  };
}

export interface RecentActivityItem {
  id: string;
  action: string;
  actionTitle: string;
  userName: string;
  timestamp: string;
  relativeTime: string;
  entityType: string;
  entityId?: string;
  isTamperEvidentValid: boolean;
}

export interface PendingCaseItem {
  accessionNumber: string;
  patientName: string;
  patientMrn: string;
  patientAge?: string | number | null;
  patientGender?: string | null;
  modality: string;
  studyDescription: string;
  pendingReason: string;
  pendingReasonLabel: string;
  pendingNotes: string | null;
  pendingAt: string;
  pendingRelative: string;
  assignedConsultantName: string;
  assignedConsultantId: string | null;
}

export interface PendingReasonStat {
  reason: string;
  label: string;
  count: number;
  percentage: number;
  colorClass: string;
}

export interface ConsultantPendingStat {
  consultantId: string | null;
  consultantName: string;
  count: number;
  percentage: number;
}

export interface PendingAnalytics {
  totalPending: number;
  mostCommonReason: string;
  highestVolumeConsultant: string;
  byReason: PendingReasonStat[];
  byConsultant: ConsultantPendingStat[];
}

export interface DashboardSummaryData {
  shift: ShiftInfo;
  kpis: DashboardKpiStats;
  activeDraft: ActiveDraftCase | null;
  urgentTriageCases: PacsStudyResult[];
  pendingQueue: PendingCaseItem[];
  pendingAnalytics: PendingAnalytics;
  modalityDistribution: ModalityCount[];
  hourlyReportingCurve: HourlyReportVolume[];
  systemHealth: SystemNodeHealth | null;
  recentActivity: RecentActivityItem[];
}
