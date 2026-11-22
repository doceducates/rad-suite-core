/**
 * Database Repair Script: Sanitizes duplicate/corrupted doctor signatures in radsuite.db
 *
 * Usage: node scripts/repair-duplicate-signatures.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../radsuite.db');
const backupDir = path.resolve(__dirname, '../db_backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 1. Mandatory Pre-Operation Backup
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
fs.copyFileSync(dbPath, path.join(backupDir, `radsuite_pre_signature_repair_${ts}.db`));
console.log(`[BACKUP] Created backup before repair: radsuite_pre_signature_repair_${ts}.db`);

const db = new Database(dbPath);

// Robust signature stripping
function stripAttributionFromText(text) {
  if (!text) return '';
  return text
    .replace(/(?:<p[^>]*>)?(?:\s*<br\s*[\/]?>\s*)*(?:<strong>|<em>)*\s*(?:Reported\s+by|Attribution|Verified\s+by):?[\s\S]*?(?:<\/p>|$)/gi, '')
    .replace(/(?:^|\n)\s*(?:_{0,2}|\*{0,2})\s*(?:Reported\s+by|Attribution|Verified\s+by):?[^\n]*(?:\n|$)/gi, '')
    .replace(/(?:<\/strong>|<\/em>|\s)+(?:<em>)?\s*Dr\.?[^<]+<\/em>(?:<\/p>)?/gi, '')
    .replace(/(?:<p[^>]*>(?:\s*<br\s*[\/]?>|\s*&nbsp;|\s*)*<\/p>\s*)+$/gi, '')
    .trim();
}

// 2. Fetch canonical HMIS signature from admin/active radiologist user
const adminUser = db.prepare(`
  SELECT hmis_reporting_doctor_name, name 
  FROM users 
  WHERE role = 'admin' OR id = 'usr-admin-mudassir' 
  LIMIT 1
`).get();

const canonicalSignature = (adminUser && adminUser.hmis_reporting_doctor_name)
  ? adminUser.hmis_reporting_doctor_name.trim()
  : 'Dr. Mudassir (PGR)';

console.log(`[CONFIG] Using canonical doctor signature: "${canonicalSignature}"`);

// 3. Scan and repair reports
const reports = db.prepare(`
  SELECT r.id, s.accession_number, p.full_name, r.impression, r.pgr_draft_impression
  FROM reports r
  JOIN studies s ON r.study_id = s.id
  JOIN patients p ON r.patient_id = p.id
`).all();

let repairedCount = 0;

const updateStmt = db.prepare(`
  UPDATE reports 
  SET impression = ?, pgr_draft_impression = ?, updated_at = ?
  WHERE id = ?
`);

const repairTx = db.transaction(() => {
  for (const rep of reports) {
    const imp = rep.impression || '';
    const draft = rep.pgr_draft_impression || '';

    const hasDoubleName = (imp.match(/Mudassir/gi) || []).length > 1;
    const hasMultipleReported = (imp.match(/Reported\s+by/gi) || []).length > 1;
    const hasStrayTag = imp.includes('</strong><em>');

    if (hasDoubleName || hasMultipleReported || hasStrayTag) {
      const cleanBody = stripAttributionFromText(imp);
      const newImpression = `${cleanBody}<p><br></p><p><strong><em>Reported by:</em></strong><em> ${canonicalSignature}</em></p>`;

      let newDraft = draft;
      if (draft && (draft.includes('</strong><em>') || (draft.match(/Mudassir/gi) || []).length > 1)) {
        const cleanDraftBody = stripAttributionFromText(draft);
        newDraft = `${cleanDraftBody}<p><br></p><p><strong><em>Reported by:</em></strong><em> ${canonicalSignature}</em></p>`;
      }

      updateStmt.run(newImpression, newDraft, new Date().toISOString(), rep.id);
      repairedCount++;

      console.log(`[REPAIRED] Case ${rep.accession_number} (${rep.full_name}):`);
      console.log(`  OLD TAIL: ${imp.slice(-150)}`);
      console.log(`  NEW TAIL: ${newImpression.slice(-150)}`);
      console.log('---');
    }
  }
});

repairTx();

console.log(`\n[COMPLETE] Successfully repaired ${repairedCount} corrupted report impressions in radsuite.db.`);
db.close();
