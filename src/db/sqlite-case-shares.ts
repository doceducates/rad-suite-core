/**
 * SQLite table definition for Secure Case Shares.
 * Keeps sqlite-init.ts modular and under the 350-line limit.
 */
export function initCaseSharesTable(sqlite: any): void {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS case_shares (
        id TEXT PRIMARY KEY,
        study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_hint TEXT,
        expires_at TEXT NOT NULL,
        duration_hours INTEGER NOT NULL DEFAULT 72,
        max_views INTEGER,
        view_count INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_case_shares_token ON case_shares(token);
      CREATE INDEX IF NOT EXISTS idx_case_shares_study_id ON case_shares(study_id);
      CREATE INDEX IF NOT EXISTS idx_case_shares_is_active ON case_shares(is_active);
      CREATE INDEX IF NOT EXISTS idx_case_shares_expires_at ON case_shares(expires_at);
    `);
  } catch (e) {
    console.warn('[SQLITE_CASE_SHARES_WARN] Non-fatal table init error:', e);
  }
}
