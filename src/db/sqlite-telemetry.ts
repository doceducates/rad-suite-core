/**
 * SQLite table definition for Client Workstations Telemetry.
 * Keeps sqlite-init.ts modular and strictly under the 350-line limit (AGENTS.md Rule 1).
 */
export function initTelemetryTables(sqlite: any): void {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS client_workstations (
        id TEXT PRIMARY KEY,
        machine_id TEXT NOT NULL UNIQUE,
        hostname TEXT DEFAULT '',
        platform TEXT NOT NULL DEFAULT 'windows',
        os_version TEXT DEFAULT '',
        app_version TEXT NOT NULL DEFAULT '1.0.0',
        last_user_id TEXT,
        last_user_name TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'online',
        metadata TEXT DEFAULT '{}',
        installed_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_workstation_machine_id ON client_workstations(machine_id);
      CREATE INDEX IF NOT EXISTS idx_workstation_last_seen ON client_workstations(last_seen_at);
      CREATE INDEX IF NOT EXISTS idx_workstation_status ON client_workstations(status);
    `);
  } catch (e) {
    console.warn('[SQLITE_TELEMETRY_WARN] Non-fatal table init error:', e);
  }
}
