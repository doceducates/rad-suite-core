/**
 * SQLite column migrations to ensure existing databases have newly added columns.
 * All operations are idempotent (checks PRAGMA table_info before ALTER TABLE).
 */
export function runSqliteMigrations(sqlite: any): void {
  try {
    const auditCols = sqlite.prepare('PRAGMA table_info(audit_log)').all().map((c: any) => c.name);
    if (auditCols.length > 0) {
      if (auditCols.includes('userName') && !auditCols.includes('user_name')) {
        sqlite.exec('ALTER TABLE audit_log RENAME COLUMN userName TO user_name;');
      } else if (!auditCols.includes('user_name')) {
        sqlite.exec('ALTER TABLE audit_log ADD COLUMN user_name TEXT;');
      }
      if (!auditCols.includes('prev_hash')) {
        sqlite.exec('ALTER TABLE audit_log ADD COLUMN prev_hash TEXT;');
      }
      if (!auditCols.includes('hash')) {
        sqlite.exec('ALTER TABLE audit_log ADD COLUMN hash TEXT;');
      }
      if (!auditCols.includes('timestamp')) {
        sqlite.exec('ALTER TABLE audit_log ADD COLUMN timestamp TEXT;');
      }
      if (!auditCols.includes('tenant_id')) {
        sqlite.exec('ALTER TABLE audit_log ADD COLUMN tenant_id TEXT DEFAULT "tnt_lgh";');
      }
    }

    const patientCols = sqlite.prepare('PRAGMA table_info(patients)').all().map((c: any) => c.name);
    if (patientCols.length > 0) {
      const addPatientCol = (name: string, def: string) => {
        if (!patientCols.includes(name)) sqlite.exec(`ALTER TABLE patients ADD COLUMN ${name} ${def};`);
      };
      addPatientCol('cnic', 'TEXT DEFAULT ""');
      addPatientCol('guardian_name', 'TEXT DEFAULT ""');
      addPatientCol('clinical_notes', 'TEXT DEFAULT ""');
      addPatientCol('tenant_id', 'TEXT NOT NULL DEFAULT "tnt_lgh"');
      addPatientCol('hmis_age', 'INTEGER');
      addPatientCol('dicom_age', 'INTEGER');
      addPatientCol('age_source', 'TEXT DEFAULT "dicom"');
      addPatientCol('updated_at', 'TEXT');
      sqlite.exec("UPDATE patients SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = '';");
    }

    const reportCols = sqlite.prepare('PRAGMA table_info(reports)').all().map((c: any) => c.name);
    if (reportCols.length > 0) {
      const addReportCol = (name: string, def: string) => {
        if (!reportCols.includes(name)) sqlite.exec(`ALTER TABLE reports ADD COLUMN ${name} ${def};`);
      };
      addReportCol('patient_id', 'TEXT');
      addReportCol('tenant_id', 'TEXT NOT NULL DEFAULT "tnt_lgh"');
      addReportCol('recommendation', 'TEXT');
      addReportCol('content_json', 'TEXT');
      addReportCol('pending_reason', 'TEXT');
      addReportCol('pending_notes', 'TEXT');
      addReportCol('pending_at', 'TEXT');
      addReportCol('pending_by', 'TEXT');
      addReportCol('pgr_draft_findings', 'TEXT');
      addReportCol('pgr_draft_impression', 'TEXT');
      addReportCol('pgr_author_id', 'TEXT');
      addReportCol('pgr_submitted_at', 'TEXT');
      addReportCol('google_doc_id', 'TEXT');
      addReportCol('google_doc_url', 'TEXT');
      addReportCol('google_synced_at', 'TEXT');
      addReportCol('google_sync_status', 'TEXT DEFAULT "none"');
      addReportCol('diagnosis_highlight', 'TEXT');
      addReportCol('discussion_json', 'TEXT');
    }


    const studyCols = sqlite.prepare('PRAGMA table_info(studies)').all().map((c: any) => c.name);
    if (studyCols.length > 0) {
      const addStudyCol = (name: string, def: string) => {
        if (!studyCols.includes(name)) sqlite.exec(`ALTER TABLE studies ADD COLUMN ${name} ${def};`);
      };
      addStudyCol('assigned_radiologist_id', 'TEXT');
      addStudyCol('tenant_id', 'TEXT NOT NULL DEFAULT "tnt_lgh"');
      addStudyCol('claimed_at', 'TEXT');
      addStudyCol('hmis_status', 'TEXT DEFAULT "unknown"');
      addStudyCol('hmis_last_checked_at', 'TEXT');
      addStudyCol('department', 'TEXT DEFAULT ""');
      addStudyCol('room', 'TEXT DEFAULT ""');
      addStudyCol('hmis_investigation_id', 'TEXT');
      addStudyCol('hmis_cpt', 'TEXT');
      addStudyCol('hmis_milestones_json', 'TEXT');
      addStudyCol('is_manual', 'INTEGER DEFAULT 0');
      addStudyCol('referring_doctor', 'TEXT DEFAULT ""');
      addStudyCol('technologist', 'TEXT DEFAULT ""');
      addStudyCol('contrast_used', 'INTEGER DEFAULT 0');
      addStudyCol('contrast_agent', 'TEXT DEFAULT ""');
      addStudyCol('contrast_volume_ml', 'INTEGER DEFAULT 0');
      addStudyCol('machine_id', 'TEXT DEFAULT ""');
      addStudyCol('updated_at', 'TEXT');
      sqlite.exec("UPDATE studies SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = '';");
      sqlite.exec("UPDATE studies SET claimed_at = COALESCE(scheduled_at, created_at, updated_at) WHERE assigned_radiologist_id IS NOT NULL AND (claimed_at IS NULL OR claimed_at = '');");
    }

    const userCols = sqlite.prepare('PRAGMA table_info(users)').all().map((c: any) => c.name);
    if (userCols.length > 0) {
      const addUserCol = (name: string, def: string) => {
        try {
          if (!userCols.includes(name)) sqlite.exec(`ALTER TABLE users ADD COLUMN ${name} ${def};`);
        } catch {}
      };
      addUserCol('title', 'TEXT DEFAULT "Resident Radiologist"');
      addUserCol('license_no', 'TEXT DEFAULT ""');
      addUserCol('department', 'TEXT DEFAULT "Radiology"');
      addUserCol('hmis_hospital_id', 'TEXT');
      addUserCol('hmis_username', 'TEXT');
      addUserCol('hmis_password', 'TEXT');
      addUserCol('hmis_reporting_doctor_name', 'TEXT');
      addUserCol('supervising_consultant_name', 'TEXT');
      addUserCol('google_email', 'TEXT');
      addUserCol('google_refresh_token', 'TEXT');
      addUserCol('google_access_token', 'TEXT');
      addUserCol('google_token_expires_at', 'TEXT');
      addUserCol('google_root_folder_id', 'TEXT');
      addUserCol('google_drive_folder_id_cases', 'TEXT');
      addUserCol('google_auto_sync', 'INTEGER DEFAULT 0');
      addUserCol('storage_provider', "TEXT DEFAULT 'auto'");
      addUserCol('status', "TEXT DEFAULT 'active'");
      addUserCol('phone', 'TEXT');
      addUserCol('hospital', 'TEXT');
      addUserCol('allowed_screens', "TEXT DEFAULT '[\"*\"]'");
      addUserCol('allowed_storage_sources', "TEXT DEFAULT '[\"local\",\"gdrive\"]'");
      addUserCol('invite_code_used', 'TEXT');
      addUserCol('invited_by', 'TEXT');
      addUserCol('tenant_id', 'TEXT NOT NULL DEFAULT "tnt_lgh"');
      addUserCol('activated_at', 'TEXT');
      try {
        sqlite.exec("UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';");
        sqlite.exec("UPDATE users SET allowed_screens = '[\"*\"]' WHERE allowed_screens IS NULL OR allowed_screens = '';");
      } catch {}
    }

    // Ensure invite_codes and pre_registrations exist if migrating an existing DB
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'radiologist',
        allowed_screens TEXT NOT NULL DEFAULT '["my_cases","worklist","workstation"]',
        max_uses INTEGER NOT NULL DEFAULT 1,
        uses_count INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        recipient_name TEXT,
        recipient_email TEXT,
        recipient_phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pre_registrations (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        hospital TEXT NOT NULL,
        role_designation TEXT NOT NULL,
        modalities_of_interest TEXT,
        status TEXT NOT NULL DEFAULT 'waitlisted',
        invite_code_sent TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const pacsCols = sqlite.prepare('PRAGMA table_info(hospital_pacs_studies)').all().map((c: any) => c.name);
    if (pacsCols.length > 0) {
      const tableSqlRow = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='hospital_pacs_studies'").get();
      const tableSql = (tableSqlRow?.sql || '').toLowerCase();
      if (tableSql.includes('accession_number text not null unique') || tableSql.includes('accession_number text unique')) {
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS hospital_pacs_studies_dg_tmp (
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
          INSERT OR IGNORE INTO hospital_pacs_studies_dg_tmp SELECT * FROM hospital_pacs_studies;
          DROP TABLE hospital_pacs_studies;
          ALTER TABLE hospital_pacs_studies_dg_tmp RENAME TO hospital_pacs_studies;
          CREATE INDEX IF NOT EXISTS idx_pacs_studies_acc ON hospital_pacs_studies(accession_number);
          CREATE INDEX IF NOT EXISTS idx_pacs_studies_modality ON hospital_pacs_studies(modality);
          CREATE INDEX IF NOT EXISTS idx_pacs_studies_date ON hospital_pacs_studies(study_date);
          CREATE INDEX IF NOT EXISTS idx_pacs_studies_s3_status ON hospital_pacs_studies(s3_status);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_pacs_studies_acc_modality ON hospital_pacs_studies(accession_number, modality);
        `);
      } else {
        sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_pacs_studies_acc_modality ON hospital_pacs_studies(accession_number, modality);');
      }

      const addPacsCol = (name: string, def: string) => {
        try {
          if (!pacsCols.includes(name)) sqlite.exec(`ALTER TABLE hospital_pacs_studies ADD COLUMN ${name} ${def};`);
        } catch {}
      };
      addPacsCol('storage_target_user_id', 'TEXT');
      addPacsCol('gdrive_file_id', 'TEXT');
      addPacsCol('gdrive_synced_at', 'TEXT');
      addPacsCol('is_ephemeral_vps', 'INTEGER DEFAULT 0');
    }

    const hotCols = sqlite.prepare('PRAGMA table_info(hot_staged_studies)').all().map((c: any) => c.name);
    if (hotCols.length > 0) {
      const addHotCol = (name: string, def: string) => {
        try {
          if (!hotCols.includes(name)) sqlite.exec(`ALTER TABLE hot_staged_studies ADD COLUMN ${name} ${def};`);
        } catch {}
      };
      addHotCol('storage_target_user_id', 'TEXT');
      addHotCol('gdrive_file_id', 'TEXT');
      addHotCol('gdrive_synced_at', 'TEXT');
      addHotCol('is_ephemeral_vps', 'INTEGER DEFAULT 0');
    }

    const vaultCols = sqlite.prepare('PRAGMA table_info(hmis_draft_vault)').all().map((c: any) => c.name);
    if (vaultCols.length > 0 && !vaultCols.includes('tenant_id')) {
      try {
        sqlite.exec('ALTER TABLE hmis_draft_vault ADD COLUMN tenant_id TEXT NOT NULL DEFAULT "tnt_lgh";');
      } catch {}
    }

    const serverCols = sqlite.prepare('PRAGMA table_info(pacs_servers)').all().map((c: any) => c.name);
    if (serverCols.length > 0 && !serverCols.includes('user_id')) {
      try {
        sqlite.exec('ALTER TABLE pacs_servers ADD COLUMN user_id TEXT;');
      } catch {}
    }

    const templateSqlRow = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='templates'").get();
    const templateSql = (templateSqlRow?.sql || '').toLowerCase();
    if (templateSql.includes('name text not null') || templateSql.includes('body_part text not null') || !templateSql.includes('title text')) {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS templates_dg_tmp (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          name TEXT DEFAULT '',
          modality TEXT NOT NULL,
          study TEXT DEFAULT '',
          body_part TEXT DEFAULT '',
          clinical_history TEXT DEFAULT '',
          technique TEXT DEFAULT '',
          findings TEXT DEFAULT '',
          impression TEXT DEFAULT '',
          recommendation TEXT DEFAULT '',
          created_by TEXT,
          is_default INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO templates_dg_tmp (id, title, name, modality, study, body_part, clinical_history, technique, findings, impression, recommendation, created_by, is_default, created_at)
        SELECT id, COALESCE(title, name, 'Template'), COALESCE(name, title, 'Template'), modality, COALESCE(study, body_part, ''), COALESCE(body_part, study, ''), clinical_history, technique, findings, impression, recommendation, created_by, is_default, created_at FROM templates;
        DROP TABLE templates;
        ALTER TABLE templates_dg_tmp RENAME TO templates;
      `);
    }

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS hmis_submissions (
        id TEXT PRIMARY KEY,
        study_id TEXT REFERENCES studies(id) ON DELETE CASCADE,
        report_id TEXT,
        destination_system TEXT,
        target_portal TEXT NOT NULL DEFAULT 'https://hmis.punjab.gov.pk/',
        status TEXT NOT NULL DEFAULT 'queued',
        payload TEXT,
        payload_json TEXT,
        note TEXT DEFAULT '',
        ack_response TEXT,
        submitted_at TEXT,
        last_retry_at TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_studies_patient_id ON studies(patient_id);
      CREATE INDEX IF NOT EXISTS idx_studies_assigned ON studies(assigned_radiologist_id);
      CREATE INDEX IF NOT EXISTS idx_studies_scheduled ON studies(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_studies_claimed_at ON studies(claimed_at);
      CREATE INDEX IF NOT EXISTS idx_studies_status_hmis ON studies(status, hmis_status);
      CREATE INDEX IF NOT EXISTS idx_reports_study_id ON reports(study_id);
      CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON reports(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
    `);
  } catch {}
}
