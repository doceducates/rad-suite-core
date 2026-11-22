/**
 * Universal Pluggable Sync Provider Specifications & Interfaces
 * Enables modular, multi-destination report replication (SQLite, PostgreSQL, S3, Google Docs, etc.)
 */

export interface SyncReportPayload {
  reportId: string;
  studyId?: string;
  accessionNumber: string;
  patientMrn: string;
  patientName: string;
  age?: number;
  gender?: string;
  modality: string;
  studyDescription: string;
  studyDate?: string | Date;
  clinicalHistory?: string;
  technique?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  criticalFinding?: boolean;
  status: string;
  signedBy?: string;
  signedAt?: string | Date;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  version?: number;
  milestoneTag?: string;
  updatedAt?: string | Date;
}

export interface SyncResult {
  success: boolean;
  providerId: string;
  status: 'synced' | 'failed' | 'skipped';
  targetRef?: string;
  error?: string;
  latencyMs?: number;
  syncedAt: string;
}

export interface ProviderConnectionStatus {
  success: boolean;
  latencyMs: number;
  message: string;
  error?: string;
}

export interface IReportSyncProvider {
  readonly id: string; // Unique identifier: 'sqlite_vault' | 's3_archive' | 'postgres_mirror' | 'google_docs'
  readonly name: string;
  readonly description: string;
  isEnabled(): boolean | Promise<boolean>;
  testConnection(): Promise<ProviderConnectionStatus>;
  pushReport(payload: SyncReportPayload): Promise<SyncResult>;
}

export interface ReportSyncSettings {
  sqliteEnabled: boolean;
  s3Enabled: boolean;
  postgresEnabled: boolean;
  postgresConnectionString?: string;
  gdocsEnabled: boolean;
}
