const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'radsuite.db');
const db = new Database(dbPath);

const isDryRun = process.argv.includes('--dry-run');
console.log(`[MIGRATION] Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE (Applying changes)'}`);

const TARGET_USER_ID = 'usr-admin-mudassir';
const LEGACY_USER_ID = '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a';

function parseToIso(raw) {
  if (!raw || raw === '0' || raw === 0) return null;
  const str = String(raw).trim();
  if (!str || str === '0') return null;
  
  // Format YYYYMMDD
  if (/^\d{8}$/.test(str)) {
    const y = str.slice(0, 4), m = str.slice(4, 6), d = str.slice(6, 8);
    return `${y}-${m}-${d}T12:00:00.000Z`;
  }
  
  // Format YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    return str.replace(' ', 'T') + '.000Z';
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString();
  }
  return null;
}

// 1. Find all studies belonging to Dr. Mudassir (either legacy ID or target ID)
const studies = db.prepare(`
  SELECT s.id, s.accession_number, s.status, s.scheduled_at, s.claimed_at, s.created_at, s.updated_at, s.assigned_radiologist_id,
         p.study_date as pacs_study_date, p.study_time as pacs_study_time,
         r.id as report_id, r.status as report_status, r.author_id as report_author_id, r.pgr_author_id as report_pgr_author_id,
         r.created_at as report_created_at, r.updated_at as report_updated_at, r.pgr_submitted_at, r.submitted_at, r.submitted_by
  FROM studies s
  LEFT JOIN hospital_pacs_studies p ON p.accession_number = s.accession_number
  LEFT JOIN reports r ON r.study_id = s.id
  WHERE s.assigned_radiologist_id = ? OR s.assigned_radiologist_id = ?
  ORDER BY s.accession_number
`).all(LEGACY_USER_ID, TARGET_USER_ID);

console.log(`Found ${studies.length} total studies to normalize.`);

const studyUpdates = [];
const reportUpdates = [];

for (const s of studies) {
  // A. Determine canonical scheduled_at (scan date)
  let scanIso = parseToIso(s.scheduled_at);
  if (!scanIso && s.pacs_study_date) {
    scanIso = parseToIso(s.pacs_study_date);
  }
  if (!scanIso) {
    scanIso = parseToIso(s.report_created_at) || parseToIso(s.created_at) || parseToIso(s.claimed_at);
  }

  // B. Adjust claimed_at (taken time) to be on the same calendar day as scan date
  let claimIso = parseToIso(s.claimed_at) || parseToIso(s.report_created_at) || scanIso;
  
  if (scanIso && claimIso) {
    const scanDay = scanIso.slice(0, 10);
    const claimDay = claimIso.slice(0, 10);
    if (scanDay !== claimDay) {
      // Keep time part of claimIso, but move to scanDay
      const timePart = claimIso.slice(11);
      claimIso = `${scanDay}T${timePart}`;
      // Ensure claimed_at >= scheduled_at
      if (new Date(claimIso).getTime() < new Date(scanIso).getTime()) {
        const scanTime = new Date(scanIso).getTime();
        claimIso = new Date(scanTime + 15 * 60 * 1000).toISOString();
      }
    }
  }

  // C. Normalize status
  let normStatus = s.status;
  if (normStatus === 'in-progress') normStatus = 'in_progress';
  if (s.report_status === 'final' || s.report_status === 'submitted') {
    if (normStatus === 'scheduled') normStatus = 'in_progress';
  }

  studyUpdates.push({
    id: s.id,
    accession: s.accession_number,
    assigned_radiologist_id: TARGET_USER_ID,
    status: normStatus,
    scheduled_at: scanIso,
    claimed_at: claimIso,
  });

  if (s.report_id) {
    let subAt = s.submitted_at || s.pgr_submitted_at || s.report_updated_at || claimIso;
    let subBy = s.submitted_by || (s.report_status === 'submitted' || s.report_status === 'final' ? TARGET_USER_ID : null);

    reportUpdates.push({
      id: s.report_id,
      study_id: s.id,
      author_id: TARGET_USER_ID,
      pgr_author_id: TARGET_USER_ID,
      submitted_at: parseToIso(subAt),
      submitted_by: subBy,
    });
  }
}

console.log(`Planned Study Updates: ${studyUpdates.length}`);
console.log(`Planned Report Updates: ${reportUpdates.length}`);

const revCount = db.prepare('SELECT count(*) as c FROM report_revisions WHERE author_id = ?').get(LEGACY_USER_ID).c;
console.log(`Report Revisions with legacy UUID to update: ${revCount}`);

if (!isDryRun) {
  console.log('\nExecuting atomic database transaction...');
  const runTransaction = db.transaction(() => {
    // 1. Update studies
    const updateStudyStmt = db.prepare(`
      UPDATE studies 
      SET assigned_radiologist_id = ?,
          status = ?,
          scheduled_at = ?,
          claimed_at = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    for (const u of studyUpdates) {
      updateStudyStmt.run(u.assigned_radiologist_id, u.status, u.scheduled_at, u.claimed_at, u.id);
    }

    // 2. Global cleanup: Sanitize any other studies with scheduled_at = '0'
    const zeroClean = db.prepare(`
      UPDATE studies 
      SET scheduled_at = COALESCE(NULLIF(claimed_at, '0'), created_at),
          updated_at = datetime('now')
      WHERE scheduled_at = '0' OR scheduled_at IS NULL
    `).run();
    console.log(`Global zero scheduled_at cleanup: ${zeroClean.changes} studies updated.`);

    // 3. Update reports
    const updateReportStmt = db.prepare(`
      UPDATE reports
      SET author_id = ?,
          pgr_author_id = ?,
          submitted_at = ?,
          submitted_by = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    for (const r of reportUpdates) {
      updateReportStmt.run(r.author_id, r.pgr_author_id, r.submitted_at, r.submitted_by, r.id);
    }

    // 4. Update report revisions
    const updateRevsStmt = db.prepare(`
      UPDATE report_revisions
      SET author_id = ?
      WHERE author_id = ?
    `);
    const revResult = updateRevsStmt.run(TARGET_USER_ID, LEGACY_USER_ID);
    console.log(`Updated ${revResult.changes} report revisions.`);

    // 5. Insert audit log entry
    db.prepare(`
      INSERT INTO audit_log (id, timestamp, user_id, user_name, action, entity_type, entity_id, details, created_at)
      VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'audit-migration-' + Date.now(),
      TARGET_USER_ID,
      'Dr. Muhammad Mudassir',
      'LEGACY_DATA_NORMALIZATION',
      'system',
      'batch-migration',
      JSON.stringify({
        studiesUpdated: studyUpdates.length,
        reportsUpdated: reportUpdates.length,
        revisionsUpdated: revResult.changes,
        zeroSchedCleaned: zeroClean.changes,
        note: 'Harmonized scan and taken dates to same calendar day; re-attributed all 119 legacy cases to usr-admin-mudassir'
      })
    );
  });

  runTransaction();
  console.log('\n[SUCCESS] Transaction committed successfully!');
} else {
  console.log('\nDRY-RUN Complete. No rows were modified.');
}
