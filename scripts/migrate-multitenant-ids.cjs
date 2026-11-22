/**
 * Industry-Standard Multi-Tenant & Type-Prefixed ID Migration Script
 * Rad Suite Core — Atomic, Idempotent, Zero-Data-Loss
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'radsuite.db');
const db = new Database(dbPath);

console.log(`[MIGRATION] Opening database at ${dbPath}`);

const USER_MAPPING = {
  'usr-admin-mudassir': 'usr_admin_mudassir',
  'res-01': 'usr_resident_01',
  'usr-consultant-test': 'usr_consultant_01',
  '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a': 'usr_admin_mudassir',
};

const DEFAULT_TENANT = {
  id: 'tnt_lgh',
  name: 'Lahore General Hospital',
  code: 'LGH',
  subdomain: 'lgh',
  status: 'active',
  settingsJson: '{}',
};

function columnExists(table, column) {
  try {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all();
    return cols.some(c => c.name === column);
  } catch {
    return false;
  }
}

function tableExists(table) {
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    return !!row;
  } catch {
    return false;
  }
}

function addColumnIfNotExists(table, column, definition) {
  if (tableExists(table) && !columnExists(table, column)) {
    console.log(`  + Adding column ${table}.${column}...`);
    db.exec(`ALTER TABLE "${table}" ADD COLUMN ${column} ${definition};`);
  }
}

// Disable foreign keys BEFORE transaction begins so SQLite permits ID cascades
db.pragma('foreign_keys = OFF');

// Execute all migrations inside an atomic transaction
const runMigration = db.transaction(() => {
  console.log('1. Ensuring tenants table exists...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      subdomain TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      settings_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  console.log('2. Seeding default hospital tenant (tnt_lgh)...');
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO tenants (id, name, code, subdomain, status, settings_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    DEFAULT_TENANT.id,
    DEFAULT_TENANT.name,
    DEFAULT_TENANT.code,
    DEFAULT_TENANT.subdomain,
    DEFAULT_TENANT.status,
    DEFAULT_TENANT.settingsJson,
    now,
    now
  );

  console.log('3. Adding tenant_id columns across clinical tables...');
  addColumnIfNotExists('users', 'tenant_id', "TEXT NOT NULL DEFAULT 'tnt_lgh'");
  addColumnIfNotExists('patients', 'tenant_id', "TEXT NOT NULL DEFAULT 'tnt_lgh'");
  addColumnIfNotExists('studies', 'tenant_id', "TEXT NOT NULL DEFAULT 'tnt_lgh'");
  addColumnIfNotExists('reports', 'tenant_id', "TEXT NOT NULL DEFAULT 'tnt_lgh'");
  addColumnIfNotExists('audit_log', 'tenant_id', "TEXT DEFAULT 'tnt_lgh'");
  addColumnIfNotExists('hmis_draft_vault', 'tenant_id', "TEXT NOT NULL DEFAULT 'tnt_lgh'");
  addColumnIfNotExists('templates', 'tenant_id', "TEXT DEFAULT 'tnt_lgh'");
  addColumnIfNotExists('pacs_servers', 'tenant_id', "TEXT DEFAULT 'tnt_lgh'");

  // Backfill tenant_id where null/empty
  const tenantTables = ['users', 'patients', 'studies', 'reports', 'audit_log', 'hmis_draft_vault', 'templates', 'pacs_servers'];
  for (const tbl of tenantTables) {
    if (tableExists(tbl) && columnExists(tbl, 'tenant_id')) {
      db.prepare(`UPDATE "${tbl}" SET tenant_id = 'tnt_lgh' WHERE tenant_id IS NULL OR tenant_id = ''`).run();
    }
  }

  console.log('4. Migrating User IDs to type-prefixed standard...');
  for (const [oldId, newId] of Object.entries(USER_MAPPING)) {
    // 4a. Users table
    const userRes = db.prepare("UPDATE users SET id = ? WHERE id = ?").run(newId, oldId);
    if (userRes.changes > 0) {
      console.log(`  - Migrated user record ${oldId} -> ${newId}`);
    }

    // 4b. Studies assigned_radiologist_id
    const studyRes = db.prepare("UPDATE studies SET assigned_radiologist_id = ? WHERE assigned_radiologist_id = ?").run(newId, oldId);
    if (studyRes.changes > 0) {
      console.log(`  - Updated ${studyRes.changes} studies assigned_radiologist_id: ${oldId} -> ${newId}`);
    }

    // 4c. Reports
    if (tableExists('reports')) {
      db.prepare("UPDATE reports SET author_id = ? WHERE author_id = ?").run(newId, oldId);
      if (columnExists('reports', 'pgr_author_id')) {
        db.prepare("UPDATE reports SET pgr_author_id = ? WHERE pgr_author_id = ?").run(newId, oldId);
      }
      if (columnExists('reports', 'submitted_by')) {
        db.prepare("UPDATE reports SET submitted_by = ? WHERE submitted_by = ?").run(newId, oldId);
      }
      if (columnExists('reports', 'pending_by')) {
        db.prepare("UPDATE reports SET pending_by = ? WHERE pending_by = ?").run(newId, oldId);
      }
    }

    // 4d. Report Revisions
    if (tableExists('report_revisions') && columnExists('report_revisions', 'author_id')) {
      db.prepare("UPDATE report_revisions SET author_id = ? WHERE author_id = ?").run(newId, oldId);
    }

    // 4e. Sessions
    if (tableExists('sessions') && columnExists('sessions', 'user_id')) {
      db.prepare("UPDATE sessions SET user_id = ? WHERE user_id = ?").run(newId, oldId);
    }

    // 4f. Audit Log
    if (tableExists('audit_log') && columnExists('audit_log', 'user_id')) {
      db.prepare("UPDATE audit_log SET user_id = ? WHERE user_id = ?").run(newId, oldId);
    }

    // 4g. Hospital PACS Studies
    if (tableExists('hospital_pacs_studies') && columnExists('hospital_pacs_studies', 'storage_target_user_id')) {
      db.prepare("UPDATE hospital_pacs_studies SET storage_target_user_id = ? WHERE storage_target_user_id = ?").run(newId, oldId);
    }

    // 4h. Hot Staged Studies
    if (tableExists('hot_staged_studies') && columnExists('hot_staged_studies', 'storage_target_user_id')) {
      db.prepare("UPDATE hot_staged_studies SET storage_target_user_id = ? WHERE storage_target_user_id = ?").run(newId, oldId);
    }

    // 4i. Invite Codes
    if (tableExists('invite_codes') && columnExists('invite_codes', 'created_by')) {
      db.prepare("UPDATE invite_codes SET created_by = ? WHERE created_by = ?").run(newId, oldId);
    }

    // 4j. Pacs Servers
    if (tableExists('pacs_servers') && columnExists('pacs_servers', 'user_id')) {
      db.prepare("UPDATE pacs_servers SET user_id = ? WHERE user_id = ?").run(newId, oldId);
    }

    // 4k. Templates
    if (tableExists('templates') && columnExists('templates', 'created_by')) {
      db.prepare("UPDATE templates SET created_by = ? WHERE created_by = ?").run(newId, oldId);
    }

    // 4l. Client Workstations
    if (tableExists('client_workstations') && columnExists('client_workstations', 'last_user_id')) {
      db.prepare("UPDATE client_workstations SET last_user_id = ? WHERE last_user_id = ?").run(newId, oldId);
    }
  }

  // 5. Create multi-tenant indexes
  console.log('5. Creating multi-tenant compound indexes...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_studies_tenant ON studies(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
  `);
});

try {
  runMigration();

  // Re-enable foreign keys and verify integrity
  db.pragma('foreign_keys = ON');
  console.log('6. Validating foreign key integrity...');
  const fkErrors = db.pragma('foreign_key_check');
  if (fkErrors && fkErrors.length > 0) {
    console.warn(`[WARN] Foreign key check reported ${fkErrors.length} warnings:`, fkErrors);
  } else {
    console.log('  All foreign key constraints verified successfully!');
  }

  console.log('\n[MIGRATION SUCCESS] Multi-tenant schema and IDs migrated safely!');
  
  // Verification queries
  const tenantRows = db.prepare("SELECT * FROM tenants").all();
  console.log('\nTenants:', tenantRows);

  const userRows = db.prepare("SELECT id, name, email, role, tenant_id FROM users").all();
  console.log('\nUsers:', userRows);

  const studyCount = db.prepare("SELECT COUNT(*) as c FROM studies WHERE assigned_radiologist_id = 'usr_admin_mudassir'").get();
  console.log(`\nStudies assigned to Dr. Mudassir (usr_admin_mudassir): ${studyCount.c}`);

  const reportCount = db.prepare("SELECT COUNT(*) as c FROM reports WHERE author_id = 'usr_admin_mudassir'").get();
  console.log(`Reports authored by Dr. Mudassir (usr_admin_mudassir): ${reportCount.c}`);

  const tenantStudies = db.prepare("SELECT tenant_id, COUNT(*) as c FROM studies GROUP BY tenant_id").all();
  console.log('\nStudies by Tenant:', tenantStudies);

} catch (err) {
  console.error('\n[MIGRATION FAILED] Transaction rolled back cleanly:', err);
  process.exit(1);
}
