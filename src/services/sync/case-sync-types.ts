export type CaseSyncAction = 'upsert' | 'delete';
export type CaseSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface CaseSyncPatient {
  id?: string;
  mrNumber: string;
  fullName: string;
  dob?: string;
  age: number;
  gender: string;
  phone?: string;
  cnic?: string;
  guardianName?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  clinicalNotes?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface CaseSyncStudy {
  id?: string;
  accessionNumber: string;
  patientMrn: string;
  modality: string;
  scanType: string;
  bodyPart: string;
  priority: string;
  status: string;
  scheduledAt: string;
  referringDoctor?: string;
  technologist?: string;
  contrastUsed?: boolean;
  contrastAgent?: string;
  contrastVolumeMl?: number;
  machineId?: string;
  assignedRadiologistId?: string;
  claimedAt?: string;
  department?: string;
  room?: string;
  clinicalHistory?: string;
  hmisInvestigationId?: string;
  hmisCpt?: string;
  hmisMilestonesJson?: string;
  hmisStatus?: string;
  isManual?: boolean;
  createdAt?: string;
  updatedAt: string;
}

export interface CaseSyncRevision {
  version: number;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  status: string;
  findings?: string;
  impression?: string;
  technique?: string;
  recommendation?: string;
  notes?: string;
  createdAt: string;
}

export interface CaseSyncReport {
  id?: string;
  accessionNumber: string;
  authorId?: string;
  status: string;
  clinicalHistory?: string;
  technique?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  recommendation?: string;
  criticalFinding?: boolean;
  signedBy?: string;
  signedAt?: string;
  pendingReason?: string;
  pendingNotes?: string;
  pendingAt?: string;
  pendingBy?: string;
  contentJson?: any;
  createdAt?: string;
  updatedAt: string;
  revisions?: CaseSyncRevision[];
}

export interface CaseSyncSeriesItem {
  seriesInstanceUid: string;
  seriesNumber?: number;
  modality: string;
  seriesDescription: string;
  numInstances: number;
  bodyPart?: string;
}

export interface CaseSyncBundle {
  accessionNumber: string;
  action: CaseSyncAction;
  patient: CaseSyncPatient;
  study: CaseSyncStudy;
  report?: CaseSyncReport;
  series?: CaseSyncSeriesItem[];
  reportingUserId?: string;
  hospitalId?: string;
  tombstoned?: boolean;
  tombstoneReason?: string;
  tombstoneDeletedAt?: string;
  clientTimestamp: string;
}

export interface SyncPushPayload {
  clientId?: string;
  bundles: CaseSyncBundle[];
  pacsStudies?: any[];
}

export interface SyncPushResult {
  success: boolean;
  processedCount: number;
  syncedAccessions: string[];
  syncedPacsStudiesCount?: number;
  conflicts: Array<{
    accessionNumber: string;
    reason: string;
    archivedRevisionVersion?: number;
  }>;
  serverTime: string;
  error?: string;
}

export interface SyncPullResult {
  success: boolean;
  bundles: CaseSyncBundle[];
  pacsStudies?: any[];
  serverTime: string;
  totalAvailable: number;
  error?: string;
}

export interface SettingsSyncBundle {
  templates?: any[];
  pacsServers?: any[];
  clinicSettings?: any;
  exportedAt: string;
}

export interface SyncStatusSummary {
  configured: boolean;
  vpsUrl: string;
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}
