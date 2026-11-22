export interface PacsServer {
  id: string;
  userId?: string | null;
  name: string;
  aeTitle: string;
  host: string;
  port: number;
  callingAeTitle: string;
  listenerPort?: number;
  retrieveProtocol: 'C-GET' | 'C-MOVE';
  isDefault: boolean;
  isActive: boolean;
  description?: string | null;
  lastPingStatus?: 'online' | 'offline' | 'unknown' | null;
  lastPingAt?: string | null;
  lastLatencyMs?: number | null;
  createdAt?: string;
}

export type StorageSourceType = 'hospital_pacs' | 'gdrive' | 's3' | 'local_archive' | 'hmis' | 'remote_node' | 'clinic_pacs';

export interface StorageSourceConfig {
  source: StorageSourceType;
  enabled: boolean;
  name: string;
  badgeColor: string;
  isOnline: boolean;
  itemCount?: number;
}

export interface UnifiedStorageSettings {
  localPath: string;
  pacsEnabled: boolean;
  gdriveEnabled: boolean;
  gdriveFolderId?: string;
  gdriveServiceAccountEmail?: string;
  gdriveKeyConfigured?: boolean;
  s3Enabled: boolean;
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3SecretConfigured?: boolean;
  s3ForcePathStyle?: boolean;
}

export interface PacsQueryFilter {
  accessionNumber?: string;
  patientMrn?: string;
  patientName?: string;
  modality?: string;
  dateRange?: 'today' | 'yesterday' | 'shift' | 'recent' | 'week' | 'month' | 'all' | 'custom' | '48h' | '7d' | '30d';
  dateFrom?: string;
  dateTo?: string;
  serverId?: string;
  source?: 'all' | 'local' | 'local_archive' | 'pacs' | 'hospital_pacs' | 'gdrive' | 's3' | 'worklist' | 'hmis' | 'remote_node';
  query?: string;
  status?: string;
  priority?: string;
  bodyPart?: string;
  gender?: string;
  criticalOnly?: boolean;
  assignedTo?: 'me' | 'unassigned' | 'all' | string;
  currentUserId?: string;
  discrepancyOnly?: boolean;
  department?: string;
  hmisOnly?: boolean;
  hideFilmCharges?: boolean;
  imagesReadyOnly?: boolean;
  groupBy?: 'patient' | 'study';
  sortBy?:
    | 'date_desc'
    | 'date_asc'
    | 'accession_asc'
    | 'accession_desc'
    | 'patient_name_asc'
    | 'patient_name_desc'
    | 'patient_name'
    | 'modality_asc'
    | 'modality_desc'
    | 'status_asc'
    | 'status_desc'
    | 'source_asc'
    | 'source_desc'
    | 'priority'
    | 'priority_asc'
    | 'priority_desc'
    | string;
  limit?: number;
  page?: number;
}

export interface SystemPresenceMap {
  pacs: boolean;
  vitrea: boolean;
  local: boolean;
  cloud: boolean;
  hmis: boolean;
  discrepancyNote?: string;
}

export interface PacsStudyResult {
  accessionNumber: string;
  patientName: string;
  patientMrn: string;
  patientId?: string;
  age: number;
  dicomAge?: number | null;
  hmisAge?: number | null;
  ageDiscrepancy?: boolean;
  ageSource?: 'dicom' | 'hmis' | 'manual';
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  cnic?: string;
  examId?: string;
  modality: string;
  studyDescription: string;
  studyDate: string;
  studyTime?: string;
  numSeries: number;
  numInstances: number;
  pacsServerAe: string;
  studyInstanceUid: string;
  referringDoctor?: string;
  technologist?: string;
  source?: 'local_archive' | 'local' | 'hospital_pacs' | 'pacs' | 'gdrive' | 's3' | 'worklist' | 'hmis' | 'mock' | 'remote_node' | 'clinic_pacs';
  availableSources?: StorageSourceType[];
  isDownloaded?: boolean;
  downloadProgress?: number;
  hasImages?: boolean;
  localCaseId?: string;
  folderPath?: string;
  status?: 'scheduled' | 'awaiting_report' | 'draft' | 'preliminary' | 'pending' | 'submitted' | 'reported' | 'final' | 'finalized' | 'amended';
  priority?: 'routine' | 'urgent' | 'stat';
  reportId?: string;
  studyId?: string;
  criticalFinding?: boolean;
  reportSections?: {
    history: boolean;
    findings: boolean;
    impression: boolean;
  };
  hasClinicalHistory?: boolean;
  hasFindings?: boolean;
  hasImpression?: boolean;
  assignedRadiologistId?: string | null;
  assignedRadiologistName?: string | null;
  claimedAt?: string | null;
  department?: string;
  room?: string;
  clinic?: string;
  patientPhone?: string;
  phone?: string;
  pendingReason?: string | null;
  pendingNotes?: string | null;
  pendingAt?: string | null;
  pendingBy?: string | null;
  hmisInvestigationId?: string;
  hmisCpt?: string;
  hmisMilestonesJson?: string;
  hmisStatus?: string | null;
  hmisLastCheckedAt?: string | null;
  presence?: SystemPresenceMap;
  isManual?: boolean;
  hasDuplicateMrn?: boolean;
  duplicateCount?: number;
  isFilmCharges?: boolean;
  isMultiStudy?: boolean;
  studies?: PacsStudyResult[];
  companionStudies?: {
    accessionNumber: string;
    studyDescription: string;
    status?: string;
    modality?: string;
    studyDate?: string;
    isFilmCharges?: boolean;
  }[];
  priorStudies?: {
    accessionNumber: string;
    studyDescription: string;
    status?: string;
    modality?: string;
    studyDate?: string;
    reportId?: string;
  }[];
  scanType?: string;
  bodyPart?: string;
  clinicalHistory?: string;
  impression?: string;
  diagnosisHighlight?: string;
}

export interface PacsNetworkDiagnostic {
  ethernetIp: string;
  ethernetGateway: string;
  wifiIp: string;
  wifiGateway: string;
  pacsHost: string;
  pacsPort: number;
  isPacsReachable: boolean;
  latencyMs?: number;
  activeRouteInterface: string;
  hasRouteConflict: boolean;
  fixCommand: string;
}
