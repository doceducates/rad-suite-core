/**
 * SQLite table definition for VPS Hot Staged Studies.
 * Keeps sqlite-init.ts modular and under the 350-line limit.
 */
export function initHotCasesTable(sqlite: any): void {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS hot_staged_studies (
        accession_number TEXT PRIMARY KEY,
        patient_name TEXT NOT NULL DEFAULT '',
        patient_id TEXT NOT NULL DEFAULT '',
        modality TEXT NOT NULL DEFAULT 'MR',
        study_description TEXT NOT NULL DEFAULT '',
        study_date TEXT NOT NULL DEFAULT '',
        study_time TEXT NOT NULL DEFAULT '',
        study_instance_uid TEXT NOT NULL DEFAULT '',
        slice_count INTEGER NOT NULL DEFAULT 0,
        total_slices INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        is_synced_to_s3 INTEGER NOT NULL DEFAULT 0,
        s3_synced_slice_count INTEGER NOT NULL DEFAULT 0,
        storage_target_user_id TEXT,
        gdrive_file_id TEXT,
        gdrive_synced_at TEXT,
        is_ephemeral_vps INTEGER NOT NULL DEFAULT 0,
        last_slice_staged_at TEXT NOT NULL,
        s3_completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_hot_staged_study_date ON hot_staged_studies(study_date);
      CREATE INDEX IF NOT EXISTS idx_hot_staged_is_synced ON hot_staged_studies(is_synced_to_s3);
      CREATE INDEX IF NOT EXISTS idx_hot_staged_updated_at ON hot_staged_studies(updated_at);
    `);
  } catch (e) {
    console.warn('[SQLITE_HOT_CASES_WARN] Non-fatal table init error:', e);
  }
}
