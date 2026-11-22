// Layer 2 (Domain/Services): Worklist Database Retention & Index Pruning Reaper
import { db, IS_SQLITE } from '@/db';
import { studies, reports, patients, caseSyncOutbox } from '@/db/schema';
import { eq, and, lt, isNull, or, isNotNull, count } from 'drizzle-orm';
import { getLocalCaseById } from './local-cases.service';
import { logAudit } from './audit.service';

export interface RetentionSummary {
  orphanedOrdersPruned: number;
  patientsPruned: number;
  protectedCasesCount: number;
  vacuumExecuted: boolean;
  executedAt: string;
}

export interface RetentionMetrics {
  daysToKeep: number;
  purgeableCount: number;
  protectedCasesCount: number;
  totalStudiesCount: number;
}

/**
 * Calculates current retention statistics without modifying any database records.
 */
export async function getWorklistRetentionMetrics(daysToKeep = 5): Promise<RetentionMetrics> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  try {
    // 1. Total studies
    const [totalRow] = await db.select({ val: count() }).from(studies);
    const totalStudiesCount = Number(totalRow?.val ?? 0);

    // 2. Protected Doctor Cases (Assigned, Claimed, or Reported)
    const [protectedRow] = await db
      .select({ val: count() })
      .from(studies)
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(
        or(
          isNotNull(studies.assignedRadiologistId),
          isNotNull(studies.claimedAt),
          isNotNull(reports.id)
        )
      );
    const protectedCasesCount = Number(protectedRow?.val ?? 0);

    // 3. Purgeable Unassigned HMIS orders older than cutoff
    const [purgeableRow] = await db
      .select({ val: count() })
      .from(studies)
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(
        and(
          isNull(reports.id),
          isNull(studies.assignedRadiologistId),
          isNull(studies.claimedAt),
          lt(studies.scheduledAt, cutoffDate)
        )
      );
    const purgeableCount = Number(purgeableRow?.val ?? 0);

    return {
      daysToKeep,
      purgeableCount,
      protectedCasesCount,
      totalStudiesCount,
    };
  } catch (err) {
    console.warn('[RETENTION_METRICS_WARN]', err);
    return {
      daysToKeep,
      purgeableCount: 0,
      protectedCasesCount: 0,
      totalStudiesCount: 0,
    };
  }
}

/**
 * Prunes unassigned, unreported HMIS orders older than daysToKeep.
 * STRICT SAFETY INVARIANT: Active doctor cases, claimed studies, and draft reports
 * are permanently protected and NEVER touched.
 */
export async function runWorklistRetentionCleanup(
  daysToKeep = 5
): Promise<RetentionSummary> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  let orphanedOrdersPruned = 0;
  let patientsPruned = 0;

  try {
    // 1. Query unassigned, unclaimed studies without reports older than cutoff
    const candidateRows = await db
      .select({
        id: studies.id,
        accession: studies.accessionNumber,
        scheduledAt: studies.scheduledAt,
        reportId: reports.id,
      })
      .from(studies)
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(
        and(
          isNull(reports.id),
          isNull(studies.assignedRadiologistId),
          isNull(studies.claimedAt),
          lt(studies.scheduledAt, cutoffDate)
        )
      );

    // 2. Only delete candidates that have NO local DICOM files on disk
    for (const c of candidateRows) {
      const hasLocalDicom = Boolean(getLocalCaseById(c.accession));
      if (!hasLocalDicom) {
        try {
          await db.delete(caseSyncOutbox).where(eq(caseSyncOutbox.entityId, c.accession));
        } catch {}
        await db.delete(studies).where(eq(studies.id, c.id));
        orphanedOrdersPruned++;
      }
    }

    // 3. Prune orphaned patient records who have no remaining studies
    if (orphanedOrdersPruned > 0) {
      try {
        const orphanedPatients = await db
          .select({ id: patients.id })
          .from(patients)
          .leftJoin(studies, eq(studies.patientId, patients.id))
          .where(isNull(studies.id));

        for (const p of orphanedPatients) {
          await db.delete(patients).where(eq(patients.id, p.id));
          patientsPruned++;
        }
      } catch (patErr) {
        console.warn('[ORPHANED_PATIENT_PRUNE_WARN]', patErr);
      }
    }

    // 4. Compact SQLite indexes and reclaim storage if in SQLite mode
    let vacuumExecuted = false;
    if (IS_SQLITE && orphanedOrdersPruned > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Database = require('better-sqlite3');
        const sqlitePath = process.env.SQLITE_PATH ?? './radsuite.db';
        const sqlite = new Database(sqlitePath);
        sqlite.pragma('optimize');
        if (orphanedOrdersPruned >= 50) {
          sqlite.exec('VACUUM');
        }
        sqlite.close();
        vacuumExecuted = true;
      } catch (err: any) {
        console.warn('[SQLITE_OPTIMIZE_WARN]', err.message);
      }
    }

    // 5. Total protected cases
    const [protectedRow] = await db
      .select({ val: count() })
      .from(studies)
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(
        or(
          isNotNull(studies.assignedRadiologistId),
          isNotNull(studies.claimedAt),
          isNotNull(reports.id)
        )
      );
    const protectedCasesCount = Number(protectedRow?.val ?? 0);

    await logAudit({
      action: 'WORKLIST_RETENTION_CLEANUP',
      entityType: 'DatabaseMaintenance',
      details: `Purged ${orphanedOrdersPruned} unassigned HMIS orders older than ${daysToKeep}d. Pruned ${patientsPruned} orphaned patients. Protected cases: ${protectedCasesCount}. Vacuum: ${vacuumExecuted}`,
    });

    return {
      orphanedOrdersPruned,
      patientsPruned,
      protectedCasesCount,
      vacuumExecuted,
      executedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[RETENTION_REAPER_ERR]', err);
    return {
      orphanedOrdersPruned: 0,
      patientsPruned: 0,
      protectedCasesCount: 0,
      vacuumExecuted: false,
      executedAt: new Date().toISOString(),
    };
  }
}
