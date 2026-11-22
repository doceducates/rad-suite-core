import crypto from 'crypto';
import { HMIS_HOSPITALS } from '../services/hmis/hmis-hospitals.data';

/**
 * Seeds initial hospitals and admin user if SQLite tables are empty.
 */
export function seedInitialSqliteData(sqlite: any): void {
  // 1. Seed hospitals if empty
  try {
    const hospCount = sqlite.prepare('SELECT COUNT(*) as c FROM hmis_hospitals').get()?.c ?? 0;
    if (hospCount === 0) {
      const insertHosp = sqlite.prepare('INSERT OR IGNORE INTO hmis_hospitals (id, name) VALUES (?, ?)');
      const insertMany = sqlite.transaction((items: readonly { id: string; name: string }[]) => {
        for (const item of items) insertHosp.run(item.id, item.name);
      });
      insertMany(HMIS_HOSPITALS);
    }
  } catch {}

  // 1b. Seed default hospital tenant if empty
  try {
    const tenantCount = sqlite.prepare('SELECT COUNT(*) as c FROM tenants').get()?.c ?? 0;
    if (tenantCount === 0) {
      sqlite.prepare(`
        INSERT OR IGNORE INTO tenants (id, name, code, subdomain, status, settings_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'tnt_lgh',
        'Lahore General Hospital',
        'LGH',
        'lgh',
        'active',
        '{}',
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  } catch {}

  // 2. Seed initial admin user if empty (for test databases and fresh installations)
  try {
    const userCount = sqlite.prepare('SELECT COUNT(*) as c FROM users').get()?.c ?? 0;
    if (userCount === 0) {
      const seedPass = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345!';
      const defaultPassword = crypto.createHash('sha256').update(seedPass + 'rad_suite_salt_2026').digest('hex');
      sqlite.prepare(`
        INSERT OR IGNORE INTO users (
          id, name, email, password_hash, role, title, license_no, department,
          avatar_color, hmis_hospital_id, hmis_username, hmis_password, hmis_reporting_doctor_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
        'Lead Radiologist',
        process.env.INITIAL_ADMIN_EMAIL || 'admin@radsuite.org',
        defaultPassword,
        'admin',
        'Consultant Radiologist',
        'RAD-001',
        'Radiology',
        '#4a7c59',
        '1',
        'admin_rad',
        null,
        'Lead Radiologist',
        new Date().toISOString()
      );
    }
  } catch {}

  // 3. Seed Universal Alpha Master Code if not present (for single-click alpha activation)
  try {
    const masterCode = 'RAD-ALPHA-2026';
    const codeExists = sqlite.prepare('SELECT COUNT(*) as c FROM invite_codes WHERE code = ?').get(masterCode)?.c ?? 0;
    if (codeExists === 0) {
      sqlite.prepare(`
        INSERT OR IGNORE INTO invite_codes (
          id, code, role, allowed_screens, max_uses, uses_count, expires_at, created_by,
          recipient_name, is_active, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'alpha-master-code-2026',
        masterCode,
        'radiologist',
        JSON.stringify(['my_cases', 'worklist', 'workstation', 'studio']),
        9999,
        0,
        null,
        null,
        'Alpha Clinician',
        1,
        'Universal Alpha Early-Access Master Code for Radiologists',
        new Date().toISOString()
      );
    }
  } catch {}

  // 4. Seed Default LGH HMIS PACS Server if pacs_servers is empty
  try {
    const pacsCount = sqlite.prepare('SELECT COUNT(*) as c FROM pacs_servers').get()?.c ?? 0;
    if (pacsCount === 0) {
      sqlite.prepare(`
        INSERT OR IGNORE INTO pacs_servers (
          id, name, ae_title, host, port, calling_ae_title, listener_port, retrieve_protocol,
          is_default, is_active, description, last_ping_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'pacs-default',
        process.env.DEFAULT_PACS_NAME || 'Hospital Central PACS',
        process.env.DEFAULT_PACS_AET || 'PACS_CENTRAL',
        process.env.DEFAULT_PACS_HOST || '127.0.0.1',
        parseInt(process.env.DEFAULT_PACS_PORT || '8040', 10),
        'RAD_SUITE',
        11112,
        'C-GET',
        1,
        1,
        'Hospital Main Radiology PACS Archive',
        'online',
        new Date().toISOString()
      );
    }
  } catch {}
}
