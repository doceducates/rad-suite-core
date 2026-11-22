// Layer 2 (Domain/Services): Background Task Types & Status Contracts
// Strict File Size Invariant: Target < 100 lines

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'interrupted';

export type TaskType =
  | 'hmis_batch_draft'
  | 'hmis_batch_revert'
  | 'clinic_upload'
  | 'clinic_pull'
  | 'dicom_import'
  | 'offline_sync'
  | 'export_archive'
  | 'system_sync'
  | 'generic';

export interface TaskItemDetail {
  id: string; // e.g. accession or unique item id
  label: string; // e.g. patient name
  secondary?: string; // e.g. modality, accession number
  status: 'pending' | 'saving' | 'success' | 'failed' | 'skipped' | 'stopped';
  detail?: string;
  error?: string;
  elapsedSeconds?: string;
  auditScreenshot?: string;
  payload?: any; // Preserved payload for resumption
}

export interface BackgroundTask {
  id: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  current: number;
  total: number;
  progressPercent: number;
  unit: string;
  statusText?: string;
  items?: TaskItemDetail[];
  startedAt: string;
  completedAt?: string;
  error?: string;
  userId?: string;
  userName?: string;
  canStop?: boolean;
  canResume?: boolean;
}

export type TaskFilter = 'all' | 'active' | 'completed' | 'stopped_failed';
