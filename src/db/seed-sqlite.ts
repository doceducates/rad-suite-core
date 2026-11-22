import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/sqlite';
import { users, patients, studies, reports, auditLog, templates } from './schema/sqlite';
import crypto from 'crypto';

const sqlitePath = process.env.SQLITE_PATH ?? './radsuite.db';
const sqlite = new Database(sqlitePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Initialize tables if they do not exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'radiologist',
    title TEXT DEFAULT 'Consultant Radiologist',
    license_no TEXT DEFAULT '',
    department TEXT DEFAULT 'Radiology',
    avatar_color TEXT NOT NULL DEFAULT '#4a7c59',
    hmis_hospital_id TEXT,
    hmis_username TEXT,
    hmis_password TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    mr_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    dob TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact TEXT,
    blood_group TEXT,
    allergies TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS studies (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    accession_number TEXT NOT NULL UNIQUE,
    modality TEXT NOT NULL,
    scan_type TEXT NOT NULL,
    body_part TEXT NOT NULL,
    clinical_history TEXT,
    priority TEXT NOT NULL DEFAULT 'routine',
    status TEXT NOT NULL DEFAULT 'pending',
    referring_physician TEXT,
    scheduled_at TEXT NOT NULL,
    completed_at TEXT,
    dicom_series_uid TEXT,
    num_instances INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft',
    clinical_history TEXT,
    technique TEXT,
    comparison TEXT,
    findings TEXT,
    impression TEXT,
    recommendations TEXT,
    critical_finding INTEGER DEFAULT 0,
    critical_finding_notified_at TEXT,
    critical_finding_notified_to TEXT,
    signed_by TEXT,
    signed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS intake_documents (
    id TEXT PRIMARY KEY,
    patient_name TEXT NOT NULL,
    mrn TEXT,
    modality_requested TEXT,
    clinical_notes TEXT,
    image_base64 TEXT,
    ocr_extracted_text TEXT,
    priority TEXT DEFAULT 'routine',
    status TEXT DEFAULT 'queued',
    reviewed_by TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hmis_submissions (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    destination_system TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload_json TEXT,
    ack_response TEXT,
    submitted_at TEXT NOT NULL,
    last_retry_at TEXT,
    retry_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    modality TEXT NOT NULL,
    body_part TEXT NOT NULL,
    clinical_history TEXT,
    technique TEXT,
    findings TEXT,
    impression TEXT,
    created_by TEXT,
    is_default INTEGER DEFAULT 0,
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
`);

const db = drizzle(sqlite, { schema });

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password + 'rad_suite_salt_2026').digest('hex');
}

async function seedSqlite() {
  console.log('--- Seeding SQLite Database (' + sqlitePath + ') ---');

  const defaultPassword = hashPassword(process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345!');

  // Insert Users
  const userAdmin = {
    id: '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
    name: 'Lead Radiologist',
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@radsuite.org',
    passwordHash: defaultPassword,
    role: 'admin',
    title: 'Consultant Radiologist',
    licenseNo: 'RAD-001',
    department: 'Radiology',
    avatarColor: '#4a7c59',
    hmisHospitalId: '1',
    hmisUsername: 'admin_rad',
    hmisPassword: null,
    createdAt: new Date().toISOString(),
  };

  const userBilal = {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    name: 'Dr. Bilal Khan',
    email: 'bilal@radsuite.pk',
    passwordHash: defaultPassword,
    role: 'radiologist',
    title: 'Associate Radiologist ? MCPS',
    licenseNo: 'PMC-RAD-99321',
    department: 'Body Imaging & Musculoskeletal',
    avatarColor: '#10b981',
    hmisHospitalId: null,
    hmisUsername: null,
    hmisPassword: null,
    createdAt: new Date().toISOString(),
  };

  const userSana = {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    name: 'Dr. Sana Tariq',
    email: 'sana@radsuite.pk',
    passwordHash: defaultPassword,
    role: 'resident',
    title: 'Radiology Resident Year-3',
    licenseNo: 'PMC-RES-44119',
    department: 'Emergency & General Radiology',
    avatarColor: '#f59e0b',
    hmisHospitalId: null,
    hmisUsername: null,
    hmisPassword: null,
    createdAt: new Date().toISOString(),
  };

  const userTech = {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    name: 'Zahid Mahmood',
    email: 'tech@radsuite.pk',
    passwordHash: defaultPassword,
    role: 'technologist',
    title: 'Lead CT/MRI Technologist',
    licenseNo: 'TECH-7712',
    department: 'Radiology Scanning Operations',
    avatarColor: '#8b5cf6',
    hmisHospitalId: null,
    hmisUsername: null,
    hmisPassword: null,
    createdAt: new Date().toISOString(),
  };

  for (const u of [userAdmin, userBilal, userSana, userTech]) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, password_hash, role, title, license_no, department, avatar_color, hmis_hospital_id, hmis_username, hmis_password, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(u.id, u.name, u.email, u.passwordHash, u.role, u.title, u.licenseNo, u.department, u.avatarColor, u.hmisHospitalId, u.hmisUsername, u.hmisPassword, u.createdAt);
  }
  console.log('Seeded 4 Staff Users into SQLite.');

  // Insert Patients (Real cases from E:\Cases)
  const patientsList = [
    {
      id: '02a04762-6e59-48c9-94eb-8ac8c119f077',
      mrNumber: '19202654149041',
      fullName: 'ALTAF BB',
      dob: '1968-04-12',
      age: 58,
      gender: 'Female',
      phone: '',
      email: '',
      address: 'Lahore',
      emergencyContact: '',
      bloodGroup: '',
      allergies: 'None',
      createdAt: '2026-09-23T18:12:34.000Z',
    },
    {
      id: '02a04762-6e59-48c9-94eb-8ac8c119f078',
      mrNumber: '19202653375928',
      fullName: 'ASGHARI BB',
      dob: '1962-09-18',
      age: 64,
      gender: 'Female',
      phone: '',
      email: '',
      address: 'Lahore',
      emergencyContact: '',
      bloodGroup: '',
      allergies: 'None',
      createdAt: '2026-09-18T17:24:18.000Z',
    },
    {
      id: 'c638202e-33bc-4559-8173-208158a4c2ac',
      mrNumber: '19202651920253',
      fullName: 'MUSTAFA',
      dob: '2014-03-10',
      age: 12,
      gender: 'Male',
      phone: '',
      email: '',
      address: 'Lahore',
      emergencyContact: '',
      bloodGroup: '',
      allergies: 'None',
      createdAt: '2026-09-19T11:49:36.000Z',
    },
    {
      id: '02a04762-6e59-48c9-94eb-8ac8c119f079',
      mrNumber: '19202653926508',
      fullName: 'M KAMRAN',
      dob: '1985-06-15',
      age: 41,
      gender: 'Male',
      phone: '',
      email: '',
      address: 'Lahore',
      emergencyContact: '',
      bloodGroup: '',
      allergies: 'None',
      createdAt: '2026-09-22T22:27:07.000Z',
    },
    {
      id: '02a04762-6e59-48c9-94eb-8ac8c119f080',
      mrNumber: '19202653305040',
      fullName: 'TAHIR HANIF',
      dob: '1979-11-20',
      age: 46,
      gender: 'Male',
      phone: '',
      email: '',
      address: 'Lahore',
      emergencyContact: '',
      bloodGroup: '',
      allergies: 'None',
      createdAt: '2026-09-19T10:15:56.000Z',
    }
  ];

  for (const p of patientsList) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO patients (id, mr_number, full_name, dob, age, gender, phone, email, address, emergency_contact, blood_group, allergies, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(p.id, p.mrNumber, p.fullName, p.dob, p.age, p.gender, p.phone, p.email, p.address, p.emergencyContact, p.bloodGroup, p.allergies, p.createdAt);
  }
  console.log('Seeded Patients into SQLite.');

  // Insert Studies (Real cases from E:\Cases)
  const studiesList = [
    {
      id: '913ce775-c76b-4685-bf9c-8a481b09af03',
      patientId: patientsList[0].id,
      accessionNumber: '192609003660',
      modality: 'MRI',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'Lumbar Spine',
      clinicalHistory: 'Chronic low back pain with left lower limb radiculopathy.',
      priority: 'routine',
      status: 'pending',
      referringPhysician: 'Orthopedics',
      scheduledAt: '2026-09-23T18:12:34.000Z',
      dicomSeriesInstanceUid: null,
      numInstances: 84,
      createdAt: '2026-09-23T18:12:34.000Z',
    },
    {
      id: '913ce775-c76b-4685-bf9c-8a481b09af04',
      patientId: patientsList[1].id,
      accessionNumber: '192609002533',
      modality: 'MRI',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'Lumbar Spine',
      clinicalHistory: 'Back ache radiating down both legs, severe on walking.',
      priority: 'routine',
      status: 'pending',
      referringPhysician: 'Neurosurgery',
      scheduledAt: '2026-09-18T17:24:18.000Z',
      dicomSeriesInstanceUid: null,
      numInstances: 96,
      createdAt: '2026-09-18T17:24:18.000Z',
    },
    {
      id: '34dcd60b-6749-4b17-b881-685ad36337b1',
      patientId: patientsList[2].id,
      accessionNumber: '192609002698',
      modality: 'MRI',
      scanType: 'MRI Brain with Contrast',
      bodyPart: 'Brain / Neuro',
      clinicalHistory: 'Recurrent severe headaches and episodes of vomiting. Rule out intracranial space-occupying lesion.',
      priority: 'stat',
      status: 'pending',
      referringPhysician: 'Neurology',
      scheduledAt: '2026-09-19T11:49:36.000Z',
      dicomSeriesInstanceUid: null,
      numInstances: 140,
      createdAt: '2026-09-19T11:49:36.000Z',
    },
    {
      id: '913ce775-c76b-4685-bf9c-8a481b09af05',
      patientId: patientsList[3].id,
      accessionNumber: '192609003430',
      modality: 'MRI',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'Lumbar Spine',
      clinicalHistory: 'Low backache radiating to right leg. L4-L5 disc evaluation.',
      priority: 'routine',
      status: 'pending',
      referringPhysician: 'Orthopedics',
      scheduledAt: '2026-09-22T22:27:07.000Z',
      dicomSeriesInstanceUid: null,
      numInstances: 84,
      createdAt: '2026-09-22T22:27:07.000Z',
    },
    {
      id: '913ce775-c76b-4685-bf9c-8a481b09af06',
      patientId: patientsList[4].id,
      accessionNumber: '192609002670',
      modality: 'MRI',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'Lumbar Spine',
      clinicalHistory: 'Chronic backache with morning stiffness.',
      priority: 'routine',
      status: 'pending',
      referringPhysician: 'Physiotherapy',
      scheduledAt: '2026-09-19T10:15:56.000Z',
      dicomSeriesInstanceUid: null,
      numInstances: 84,
      createdAt: '2026-09-19T10:15:56.000Z',
    }
  ];

  for (const s of studiesList) {
    sqlite.prepare(`
      INSERT OR REPLACE INTO studies (id, patient_id, accession_number, modality, scan_type, body_part, clinical_history, priority, status, referring_physician, scheduled_at, dicom_series_uid, num_instances, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s.id, s.patientId, s.accessionNumber, s.modality, s.scanType, s.bodyPart, s.clinicalHistory, s.priority, s.status, s.referringPhysician, s.scheduledAt, s.dicomSeriesInstanceUid, s.numInstances, s.createdAt);
  }
  console.log('Seeded Real Clinical Studies into SQLite.');

  // Insert Default PACS Server
  sqlite.prepare(`
    INSERT OR REPLACE INTO pacs_servers (id, name, ae_title, host, port, calling_ae_title, listener_port, retrieve_protocol, is_default, is_active, description, last_ping_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    'Hospital Departmental Archive',
    'unknown',
    new Date().toISOString()
  );
  console.log('Seeded Default PACS Server into SQLite.');

  console.log('=== SQLite Database Ready at: ' + sqlitePath + ' ===');
  sqlite.close();
}

seedSqlite().catch(console.error);
