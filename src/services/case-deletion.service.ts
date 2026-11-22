// Layer 2 (Domain/Services): Workstation Case Deletion & Tombstone Service
import { db, sqlite } from '@/db';
import { studies, patients, reports, reportRevisions, tombstonedAccessions } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { logAudit } from './audit.service';

export interface UserContext {
  id: string;
  name: string;
  role?: string;
}

/**
 * Returns the set of all accession numbers that have been tombstoned/deleted
 * by the radiologist from the local workstation index.
 */
export async function getTombstonedAccessions(): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const rows = await db.select({ accession: tombstonedAccessions.accession }).from(tombstonedAccessions);
    for (const r of rows) {
      if (r.accession) {
        set.add(r.accession.trim().toUpperCase());
      }
    }
  } catch (err) {
    console.warn('[TOMBSTONE_WARN] Failed reading tombstoned accessions:', err);
  }
  return set;
}

/**
 * Safely deletes a study from the local workstation index.
 * 
 * Clinical Invariant:
 * This operation affects ONLY the local Rad Suite index and SQLite storage.
 * It NEVER mutates or deletes remote hospital HMIS or PACS archives.
 */
export async function deleteCaseFromIndex(
  accessionOrId: string,
  user: UserContext,
  reason = 'User removed from worklist'
): Promise<{ success: boolean; accessionNumber: string }> {
  const normAcc = accessionOrId.trim().toUpperCase();
  if (!normAcc) {
    throw new Error('Accession number is required for deletion.');
  }

  // 1. Locate existing study in database
  const [study] = await db
    .select()
    .from(studies)
    .where(or(eq(studies.accessionNumber, normAcc), eq(studies.id, accessionOrId)))
    .limit(1);

  if (study) {
    const studyAcc = study.accessionNumber.toUpperCase();

    // 2. Cascade delete reports & revisions
    const reportList = await db.select().from(reports).where(eq(reports.studyId, study.id));
    for (const rep of reportList) {
      await db.delete(reportRevisions).where(eq(reportRevisions.reportId, rep.id));
      await db.delete(reports).where(eq(reports.id, rep.id));

      // Clean hmisSubmissions if table exists
      try {
        sqlite.prepare('DELETE FROM hmis_submissions WHERE report_id = ?').run(rep.id);
      } catch {}
    }

    // 3. Clean up draft vault for this accession
    try {
      sqlite.prepare('DELETE FROM hmis_draft_vault WHERE UPPER(accession) = ?').run(studyAcc);
    } catch {}

    // 4. Delete the study record
    await db.delete(studies).where(eq(studies.id, study.id));

    // 5. Clean up patient if no other studies remain
    const remaining = await db
      .select({ id: studies.id })
      .from(studies)
      .where(eq(studies.patientId, study.patientId))
      .limit(1);

    if (remaining.length === 0) {
      await db.delete(patients).where(eq(patients.id, study.patientId));
    }
  }

  // 6. Record in tombstoned_accessions to keep local archive / re-scans hidden
  try {
    const nowIso = new Date().toISOString();
    sqlite
      .prepare('INSERT OR REPLACE INTO tombstoned_accessions (accession, reason, deleted_at) VALUES (?, ?, ?)')
      .run(normAcc, reason, nowIso);
  } catch (err) {
    console.warn('[TOMBSTONE_WRITE_WARN] Failed writing tombstone record:', err);
  }

  // 7. Audit log entry
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'DELETE_CASE_FROM_INDEX',
    entityType: 'Study',
    entityId: normAcc,
    details: `Removed case ${normAcc} from local workstation index. Reason: ${reason}`,
  });

  // 8. Enqueue deletion to sync outbox
  try {
    const { enqueueCaseSync } = await import('./sync/case-sync-outbox.service');
    await enqueueCaseSync(normAcc, 'delete');
  } catch (err) {
    console.warn('[CASE_SYNC_TOMBSTONE_WARN]', err);
  }

  return { success: true, accessionNumber: normAcc };
}

/**
 * Restores a previously tombstoned case back to the active worklist index.
 */
export async function restoreCaseToIndex(
  accession: string,
  user: UserContext
): Promise<{ success: boolean; accessionNumber: string }> {
  const normAcc = accession.trim().toUpperCase();
  try {
    sqlite.prepare('DELETE FROM tombstoned_accessions WHERE UPPER(accession) = ?').run(normAcc);
  } catch {}

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'RESTORE_CASE_TO_INDEX',
    entityType: 'Study',
    entityId: normAcc,
    details: `Restored case ${normAcc} back to workstation index.`,
  });

  return { success: true, accessionNumber: normAcc };
}

export interface BatchDeleteOptions {
  preserveReported?: boolean;
  olderThanHours?: number;
  unassignedOnly?: boolean;
  reason?: string;
}

export interface BatchDeleteResult {
  success: boolean;
  deletedCount: number;
  skippedCount: number;
  deletedAccessions: string[];
}

/**
 * Safely batch removes studies from the local workstation index.
 * Automatically safeguards claimed cases and active reports unless explicitly forced.
 */
export async function batchDeleteCasesFromIndex(
  inputAccessions: string[],
  user: UserContext,
  options: BatchDeleteOptions = {}
): Promise<BatchDeleteResult> {
  const {
    preserveReported = true,
    olderThanHours,
    unassignedOnly = true,
    reason = 'Batch removal from workstation index',
  } = options;

  const accessionsToProcess = new Set<string>(
    inputAccessions.map((a) => a.trim().toUpperCase()).filter(Boolean)
  );

  // If olderThanHours is specified, find older studies in DB to prune
  if (typeof olderThanHours === 'number' && olderThanHours > 0) {
    const cutoffDate = new Date(Date.now() - olderThanHours * 3600 * 1000).toISOString();
    try {
      const rows = sqlite
        .prepare(`
          SELECT s.accession_number
          FROM studies s
          LEFT JOIN reports r ON r.study_id = s.id
          WHERE s.scheduled_at < ?
          ${unassignedOnly ? 'AND (s.assigned_radiologist_id IS NULL OR s.assigned_radiologist_id = "")' : ''}
          ${preserveReported ? 'AND r.id IS NULL' : ''}
        `)
        .all(cutoffDate) as Array<{ accession_number: string }>;

      for (const r of rows) {
        if (r.accession_number) {
          accessionsToProcess.add(r.accession_number.trim().toUpperCase());
        }
      }
    } catch (err) {
      console.warn('[BATCH_PRUNE_QUERY_WARN] Failed querying stale studies:', err);
    }
  }

  let deletedCount = 0;
  let skippedCount = 0;
  const deletedAccessions: string[] = [];

  for (const acc of accessionsToProcess) {
    try {
      if (preserveReported) {
        const existing = sqlite
          .prepare(`
            SELECT s.id, s.assigned_radiologist_id, (SELECT count(*) FROM reports WHERE study_id = s.id) as report_count
            FROM studies s
            WHERE UPPER(s.accession_number) = ?
            LIMIT 1
          `)
          .get(acc) as { id?: string; assigned_radiologist_id?: string; report_count?: number } | undefined;

        if (existing && ((existing.report_count ?? 0) > 0 || Boolean(existing.assigned_radiologist_id))) {
          skippedCount++;
          continue;
        }
      }

      await deleteCaseFromIndex(acc, user, reason);
      deletedAccessions.push(acc);
      deletedCount++;
    } catch (err) {
      console.warn(`[BATCH_DELETE_WARN] Failed deleting case ${acc}:`, err);
    }
  }

  return {
    success: true,
    deletedCount,
    skippedCount,
    deletedAccessions,
  };
}

