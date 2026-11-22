// Layer 2: Clinic Node Domain Types & Telemetry Models

export interface ClinicDiskMetrics {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  usedPercent: number;
  maxStorageSizeGb?: number;
}

export interface SyncedStudyRecord {
  id: string;
  patientName: string;
  patientId: string;
  accession: string;
  modality: string;
  studyDate: string;
  time: string;
  studyTime?: string;
  studyDescription?: string;
  description?: string;
  sliceCount?: number;
  numInstances?: number;
  seriesCount?: number;
  numSeries?: number;
  patientAge?: string;
  patientSex?: string;
  patientBirthDate?: string;
  seriesList?: any[];
  status: 'synced' | 'pending' | 'failed';
}

export type LocalStudyLifecycleState =
  | 'on_pacs'
  | 'downloading'
  | 'in_sandbox'
  | 'uploading'
  | 'synced'
  | 'failed';

export interface LocalResidentStudy {
  studyId: string;
  accession: string;
  patientName: string;
  patientId: string;
  patientAge?: string;
  patientSex?: string;
  patientBirthDate?: string;
  seriesList?: any[];
  seriesCount?: number;
  numSeries?: number;
  modality: string;
  studyDate: string;
  studyTime?: string;
  time?: string;
  studyDescription: string;
  sliceCount: number;
  totalPacsSlices?: number;
  downloadedSlices?: number;
  uploadedSlices?: number;
  state?: LocalStudyLifecycleState;
  sizeMb: number;
  isSyncedToS3: boolean;
}

export interface GoogleDriveStatus {
  configured: boolean;
  folderId?: string;
  totalSynced?: number;
  lastTestMessage?: string | null;
  lastTestSuccess?: boolean | null;
}

export interface PacsLinkStatus {
  connected: boolean;
  latencyMs?: number;
  message?: string;
  targetHost?: string;
  targetPort?: number;
  lastChecked?: string;
}

export interface ClinicS3Status {
  connected: boolean;
  endpoint?: string;
  bucket?: string;
  lastTestMessage?: string | null;
  lastTestSuccess?: boolean | null;
}

export interface ClinicSyncRules {
  allowedModalities: string[];
  descriptionKeywords: string[];
  bypassKeywords?: boolean;
  syncMode: 'auto_filtered' | 'manual';
}

export interface ClinicCommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode?: number | string;
  timestamp: string;
}

export interface ClinicScheduleConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowWeekends?: boolean;
}

export type HarvestDateScope = 'today' | 'yesterday' | 'last_2_days' | 'custom';

export interface ClinicHarvestSchedule {
  enabled: boolean;
  intervalMinutes: number;
  concurrency?: number;
  modalities: string[];
  scope?: HarvestDateScope;
  customDate?: string;
  startHour?: number;
  endHour?: number;
  allowWeekends?: boolean;
  keywords?: string[];
  bypassKeywords?: boolean;
}

export interface ClinicDiagnosticsReport {
  timestamp: string;
  orthancHttp: { status: 'pass' | 'fail'; latencyMs?: number; version?: string; error?: string };
  orthancDicom: { status: 'pass' | 'fail'; port?: number; error?: string };
  s3Write: { status: 'pass' | 'fail'; latencyMs?: number; bucket?: string; error?: string };
  hospitalPacs: { status: 'pass' | 'fail' | 'skipped'; host?: string; port?: number; latencyMs?: number; error?: string };
  disk: { status: 'pass' | 'warn' | 'fail'; freeGb: number; usedPercent: number };
}

export interface StallWatchdogConfig {
  enabled: boolean;
  softRestartMinutes: number;
  autoRebootMinutes: number;
  maxRebootsPerDay?: number;
  requireNetworkProbe?: boolean;
  networkWatchdogEnabled?: boolean;
  wifiGraceMinutes?: number;
  wifiCooldownMinutes?: number;
  offlineRebootMinutes?: number;
}

export interface PeerCooperationConfig {
  enabled: boolean;
  leaseTtlMinutes?: number;
  peerMeshRelay?: boolean;
  autoFailover?: boolean;
}

export interface PeerNodeInfo {
  nodeId: string;
  name: string;
  hostname: string;
  lanIp: string;
  isPrimaryHarvester: boolean;
  role: 'primary' | 'secondary_console';
  orthancHttpPort: number;
  lastHeartbeat?: string | null;
}

export interface InFlightStudyClaim {
  studyKey: string;
  accession: string;
  modality: string;
  claimedBy: string;
  stage: 'downloading' | 'uploading';
  progressPercent?: number;
  lastActiveAt: number;
  expiresAt: number;
}

export type ClinicActionType =
  | 'start' | 'stop' | 'restart' | 'reboot' | 'clear-cache' | 'revert-config'
  | 'test-gdrive' | 'set-gdrive-folder' | 'ping-pacs' | 'exec' | 'update-script'
  | 'test-s3' | 'set-sync-rules' | 'harvest-pacs' | 'fetch-accession' | 'search-pacs' | 'batch-upload-s3'
  | 'pause-sync' | 'resume-sync' | 'set-schedule' | 'run-diagnostics'
  | 'register-node' | 'remove-node' | 'rename-node'
  | 'set-disk-cap' | 'set-heartbeat-interval' | 'set-compression' | 'set-auto-retention'
  | 'purge-local-study' | 'purge-synced-older-than' | 'set-harvest-schedule'
  | 'set-stall-watchdog' | 'set-peer-cooperation'
  | 'uninstall-agent'
  | 'set-wifi-networks'
  | 'enforce-network-policy'
  | 'isolate-wifi'
  | 'restore-wifi'
  | 'save-all-settings'
  | 'get-logs'
  | 'prune-logs';

export interface ActiveDownloadStatus {
  accession: string;
  patientName: string;
  modality: string;
  studyDescription?: string;
  downloadedSlices: number;
  totalSlices: number;
  progressPercent: number;
  startedAt?: string;
}

export interface DownloadQueueItem {
  accession: string;
  patientName: string;
  modality: string;
  studyDescription?: string;
  totalSlices: number;
  downloadedSlices?: number;
  status: 'on_pacs' | 'downloading';
}

export interface ActiveUploadStatus {
  accession: string;
  patientName: string;
  modality: string;
  seriesDescription?: string;
  completedSlices: number;
  totalSlices: number;
  progressPercent: number;
  speedKbs?: number;
}

export interface UploadQueueItem {
  accession: string;
  patientName: string;
  modality: string;
  studyDescription?: string;
  totalSlices: number;
  status: 'queued' | 'uploading' | 'failed';
  enqueuedAt?: string;
}

export interface ClinicInventorySummary {
  total: number;
  onPacs: number;
  downloading?: number;
  inSandbox: number;
  uploading: number;
  synced: number;
  failed: number;
}

export interface ClinicNodeTelemetry {
  nodeId: string;
  name?: string;
  hostname?: string;
  lanIp?: string;
  online: boolean;
  status?: string;
  orthancStatus: 'running' | 'stopped' | 'starting' | 'stopping' | 'unknown';
  disk: ClinicDiskMetrics;
  casesToday: number;
  targetCases: number;
  instancesToday: number;
  syncedStudies: SyncedStudyRecord[];
  activeDownload?: ActiveDownloadStatus | null;
  downloadQueue?: DownloadQueueItem[];
  activeUpload?: ActiveUploadStatus | null;
  uploadQueue?: UploadQueueItem[];
  lastHeartbeat: string | null;
  pendingAction: string | null;
  googleDrive?: GoogleDriveStatus;
  pacsStatus?: PacsLinkStatus;
  s3Status?: ClinicS3Status;
  syncRules?: ClinicSyncRules;
  lastCommandOutput?: ClinicCommandResult | null;
  syncPaused?: boolean;
  schedule?: ClinicScheduleConfig | null;
  harvestSchedule?: ClinicHarvestSchedule | null;
  diagnostics?: ClinicDiagnosticsReport | null;
  compression?: { enabled: boolean; method: string };
  heartbeatIntervalMs?: number;
  autoRetention?: { enabled: boolean; ageDays: number };
  stallWatchdog?: StallWatchdogConfig | null;
  peerCooperation?: PeerCooperationConfig | null;
  localStudies?: LocalResidentStudy[];
  inventorySummary?: ClinicInventorySummary | null;
  scriptVersion?: string;
  ipAddress?: string;
  relayedFrom?: string;
  knownNetworks?: Array<{ ssid: string; password?: string }>;
  wifiIsolation?: { active: boolean; remainingMinutes: number; expiresAt: string | null } | null;
}
