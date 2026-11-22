const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', '..', 'radsuite.db');
const db = new Database(dbPath);

const cols = db.prepare('PRAGMA table_info(patients)').all().map(c => c.name);

if (!cols.includes('hmis_age')) {
  db.prepare('ALTER TABLE patients ADD COLUMN hmis_age INTEGER').run();
  console.log('Added hmis_age to patients');
}

if (!cols.includes('dicom_age')) {
  db.prepare('ALTER TABLE patients ADD COLUMN dicom_age INTEGER').run();
  console.log('Added dicom_age to patients');
}

if (!cols.includes('age_source')) {
  db.prepare("ALTER TABLE patients ADD COLUMN age_source TEXT DEFAULT 'dicom'").run();
  console.log('Added age_source to patients');
}

const updatedCols = db.prepare('PRAGMA table_info(patients)').all().map(c => c.name);
console.log('Final patients columns:', updatedCols);
db.close();
