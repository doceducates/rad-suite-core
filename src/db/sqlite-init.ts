import { runSqliteMigrations } from './sqlite-migrations';
import { seedInitialSqliteData } from './sqlite-seed';
import { initHotCasesTable } from './sqlite-hot-cases';
import { initCaseSharesTable } from './sqlite-case-shares';
import { initTelemetryTables } from './sqlite-telemetry';
import { initSqliteSyncTables } from './sqlite-sync-init';

export function initSqliteTables(sqlite: any): void {
  try {
    // 1. Core tables initialization (Tenants, Users, Patients, Studies, Reports)
    sqlite.exec(`
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

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'tnt_lgh',
        name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'radiologist', status TEXT NOT NULL DEFAULT 'pending_invite',
        phone TEXT, hospital TEXT, allowed_screens TEXT DEFAULT '["my_cases","worklist","workstation"]',
        invite_code_used TEXT, invited_by TEXT, activated_at TEXT,
        title TEXT DEFAULT 'Resident Radiologist', license_no TEXT DEFAULT '', department TEXT DEFAULT 'Radiology',
        avatar_color TEXT NOT NULL DEFAULT '#4a7c59',
        hmis_hospital_id TEXT, hmis_username TEXT, hmis_password TEXT, hmis_reporting_doctor_name TEXT,
        google_email TEXT, google_refresh_token TEXT, google_access_token TEXT, google_token_expires_at TEXT,
        google_root_folder_id TEXT, google_auto_sync INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invite_codes (
        id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'radiologist',
        allowed_screens TEXT NOT NULL DEFAULT '["my_cases","worklist","workstation"]',
        max_uses INTEGER NOT NULL DEFAULT 1, uses_count INTEGER NOT NULL DEFAULT 0, expires_at TEXT,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        recipient_name TEXT, recipient_email TEXT, recipient_phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1, notes TEXT, created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pre_registrations (
        id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
        hospital TEXT NOT NULL, role_designation TEXT NOT NULL, modalities_of_interest TEXT,
        status TEXT NOT NULL DEFAULT 'waitlisted', invite_code_sent TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'tnt_lgh',
        mr_number TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        dob TEXT NOT NULL, age INTEGER NOT NULL, gender TEXT NOT NULL,
        phone TEXT, cnic TEXT DEFAULT '', guardian_name TEXT DEFAULT '',
        clinical_notes TEXT DEFAULT '', email TEXT, address TEXT,
        emergency_contact TEXT, blood_group TEXT, allergies TEXT,
        created_at TEXT NOT NULL, updated_at TEXT,
        hmis_age INTEGER,
        dicom_age INTEGER,
        age_source TEXT DEFAULT 'dicom'
      );

      CREATE TABLE IF NOT EXISTS studies (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'tnt_lgh',
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        accession_number TEXT NOT NULL UNIQUE,
        modality TEXT NOT NULL,
        scan_type TEXT NOT NULL,
        body_part TEXT NOT NULL,
        clinical_history TEXT,
        priority TEXT NOT NULL DEFAULT 'routine',
        status TEXT NOT NULL DEFAULT 'pending',
        referring_doctor TEXT DEFAULT '',
        referring_physician TEXT DEFAULT '',
        technologist TEXT DEFAULT '',
        contrast_used INTEGER DEFAULT 0,
        contrast_agent TEXT DEFAULT '',
        contrast_volume_ml INTEGER DEFAULT 0,
        machine_id TEXT DEFAULT '',
        scheduled_at TEXT NOT NULL,
        completed_at TEXT,
        dicom_series_uid TEXT,
        num_instances INTEGER DEFAULT 1,
        assigned_radiologist_id TEXT,
        claimed_at TEXT,
        hmis_status TEXT DEFAULT 'unknown',
        hmis_last_checked_at TEXT,
        department TEXT DEFAULT '',
        room TEXT DEFAULT '',
        hmis_investigation_id TEXT,
        hmis_cpt TEXT,
        hmis_milestones_json TEXT,
        is_manual INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'tnt_lgh',
        study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
        patient_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        clinical_history TEXT,
        technique TEXT,
        comparison TEXT,
        findings TEXT,
        impression TEXT,
        recommendation TEXT,
        recommendations TEXT,
        content_json TEXT,
        critical_finding INTEGER DEFAULT 0,
        critical_finding_notified_at TEXT,
        critical_finding_notified_to TEXT,
        signed_by TEXT,
        signed_at TEXT,
        submitted_by TEXT,
        submitted_at TEXT,
        author_id TEXT,
        pending_reason TEXT,
        pending_notes TEXT,
        pending_at TEXT,
        pending_by TEXT,
        pgr_draft_findings TEXT,
        pgr_draft_impression TEXT,
        pgr_author_id TEXT,
        pgr_submitted_at TEXT,
        google_doc_id TEXT,
        google_doc_url TEXT,
        google_synced_at TEXT,
        google_sync_status TEXT DEFAULT 'none',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'tnt_lgh',
        timestamp TEXT DEFAULT (datetime('now')),
        user_id TEXT,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        prev_hash TEXT,
        hash TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS report_revisions (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        author_id TEXT,
        author_name TEXT,
        author_role TEXT,
        status TEXT NOT NULL,
        findings TEXT,
        impression TEXT,
        technique TEXT,
        recommendation TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collaborative_sessions (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        active_users_json TEXT,
        last_update TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pacs_servers (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        ae_title TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        calling_ae_title TEXT NOT NULL DEFAULT 'RADIANT',
        listener_port INTEGER NOT NULL DEFAULT 11112,
        retrieve_protocol TEXT NOT NULL DEFAULT 'C-GET',
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        description TEXT DEFAULT '',
        last_ping_status TEXT DEFAULT 'unknown',
        last_ping_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        modality TEXT NOT NULL,
        study TEXT NOT NULL,
        technique TEXT DEFAULT '',
        findings TEXT DEFAULT '',
        impression TEXT DEFAULT '',
        recommendation TEXT DEFAULT '',
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS radiopaedia_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_id TEXT NOT NULL,
        client_secret TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        requests_today INTEGER DEFAULT 0,
        rate_limit_reset_at INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hmis_draft_vault (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'tnt_lgh',
        accession TEXT NOT NULL,
        patient_mrn TEXT NOT NULL,
        patient_name TEXT DEFAULT '',
        investigation_id TEXT DEFAULT '',
        module_id TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1',
        clinical_history TEXT DEFAULT '',
        technique TEXT DEFAULT '',
        findings TEXT DEFAULT '',
        impression TEXT DEFAULT '',
        comments TEXT DEFAULT '',
        pgr_name TEXT DEFAULT '',
        consultant_name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        verification_audit TEXT DEFAULT '',
        audit_screenshot TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        verified_at TEXT
      );

      CREATE TABLE IF NOT EXISTS hmis_hospitals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hmis_submissions (
        id TEXT PRIMARY KEY,
        study_id TEXT REFERENCES studies(id) ON DELETE CASCADE,
        report_id TEXT,
        destination_system TEXT,
        target_portal TEXT NOT NULL DEFAULT 'https://hmis.punjab.gov.pk/',
        status TEXT NOT NULL DEFAULT 'queued',
        payload TEXT, payload_json TEXT, note TEXT DEFAULT '', ack_response TEXT,
        submitted_at TEXT, last_retry_at TEXT, retry_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS agent_api_keys (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'tnt_lgh',
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'radiologist',
        scopes TEXT NOT NULL DEFAULT '["cases:read","reports:read","reports:draft_write","knowledge:read"]',
        allowed_tools TEXT NOT NULL DEFAULT '["*"]',
        is_read_only INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        expires_at TEXT,
        last_used_at TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 2. Initialize sync outbox and PACS studies tables
    initSqliteSyncTables(sqlite);

    // 3. Run column migrations for existing databases
    runSqliteMigrations(sqlite);

    // 4. Initialize VPS hot staging tables, case shares & telemetry
    initHotCasesTable(sqlite);
    initCaseSharesTable(sqlite);
    initTelemetryTables(sqlite);

    // 5. Seed initial hospitals, default tenant & admin user
    seedInitialSqliteData(sqlite);
  } catch (err) {
    console.warn('[SQLITE_INIT_WARN] Non-fatal table init error:', err);
  }
}
