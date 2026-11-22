// Layer 2 (Domain/Services): HMIS Background Queue Types
// Strict File Size Invariant: Target < 60 lines

export interface HmisDraftItem {
  studyId?: string;
  accessionNumber: string;
  patientMrn?: string;
  patientName?: string;
  patientId?: string;
  scanType?: string;
  modality?: string;
  bodyPart?: string;
  studyDescription?: string;
  clinicalHistory?: string;
  hmisCpt?: string;
  hmisInvestigationId?: string;
  findings?: string;
  impression?: string;
  technique?: string;
}

export interface HmisBatchItemRecord {
  accessionNumber: string;
  patientName: string;
  patientMrn?: string;
  scanType?: string;
  modality?: string;
  status: 'pending' | 'saving' | 'success' | 'failed' | 'skipped' | 'stopped';
  verified?: boolean;
  auditScreenshot?: string;
  elapsedSeconds?: string;
  error?: string;
  savedAt?: string;
}

export interface QueueOptions {
  doctorName?: string;
  deepVerify?: boolean;
  originPath?: string;
  action?: 'draft' | 'submit';
  onProgress?: (current: number, total: number) => void;
  onComplete?: (summary: { succeeded: number; failed: number; skipped: number; results: HmisBatchItemRecord[] }) => void;
}
