/**
 * SQLite Initialization for Sync, Outbox, and Hospital PACS Tables
 * Layer 3 (Data) — Architectural modularity invariant (<150 lines)
 */

export function initSqliteSyncTables(sqlite: any): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tombstoned_accessions (
      accession TEXT PRIMARY KEY,
      reason TEXT DEFAULT 'user_deleted',
      deleted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_sync_outbox (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      accession_number TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      target_ref TEXT,
      error_message TEXT,
      synced_at TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_report ON report_sync_outbox(report_id);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON report_sync_outbox(status);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_provider ON report_sync_outbox(provider_id);

    CREATE TABLE IF NOT EXISTS case_sync_outbox (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL DEFAULT 'case_bundle',
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'upsert',
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      last_attempt_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_case_sync_status ON case_sync_outbox(status);
    CREATE INDEX IF NOT EXISTS idx_case_sync_entity ON case_sync_outbox(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_case_sync_created ON case_sync_outbox(created_at);

    CREATE TABLE IF NOT EXISTS hospital_pacs_studies (
      id TEXT PRIMARY KEY,
      accession_number TEXT NOT NULL,
      patient_name TEXT DEFAULT '',
      patient_id TEXT DEFAULT '',
      patient_mrn TEXT DEFAULT '',
      modality TEXT NOT NULL DEFAULT 'MR',
      study_description TEXT DEFAULT '',
      study_date TEXT DEFAULT '',
      study_time TEXT DEFAULT '',
      study_instance_uid TEXT DEFAULT '',
      num_series INTEGER DEFAULT 1,
      num_instances INTEGER DEFAULT 1,
      pacs_source TEXT DEFAULT 'HMIS_PACS',
      s3_status TEXT DEFAULT 'not_uploaded',
      s3_key_prefix TEXT,
      s3_uploaded_at TEXT,
      last_indexed_at TEXT NOT NULL,
      raw_tags_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pacs_studies_acc ON hospital_pacs_studies(accession_number);
    CREATE INDEX IF NOT EXISTS idx_pacs_studies_modality ON hospital_pacs_studies(modality);
    CREATE INDEX IF NOT EXISTS idx_pacs_studies_date ON hospital_pacs_studies(study_date);
    CREATE INDEX IF NOT EXISTS idx_pacs_studies_s3_status ON hospital_pacs_studies(s3_status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pacs_studies_acc_modality ON hospital_pacs_studies(accession_number, modality);

    CREATE TABLE IF NOT EXISTS sync_changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      data_json TEXT,
      actor_id TEXT DEFAULT 'system',
      changed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_changelog_table_entity ON sync_changelog(table_name, entity_id);
    CREATE INDEX IF NOT EXISTS idx_sync_changelog_changed_at ON sync_changelog(changed_at);
  `);
}
