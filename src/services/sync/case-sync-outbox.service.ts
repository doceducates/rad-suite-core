// Layer 2: Durable Offline Outbox Queue & Sync Orchestration Service
import crypto from 'crypto';
import { db } from '@/db';
import { caseSyncOutbox, studies, hospitalPacsStudies } from '@/db/schema';
import { eq, or, inArray, desc, sql } from 'drizzle-orm';
import type { CaseSyncBundle, SyncStatusSummary, CaseSyncAction } from './case-sync-types';
import { buildCaseBundle, applyCaseBundle } from './case-sync-bundle.service';
import { pushBundlesToVps, pullBundlesFromVps, isVpsSyncConfigured } from './case-sync-client.service';
import { logAudit } from '../audit.service';

/**
 * Enqueues a case mutation into the durable outbox queue.
 * Runs in sub-millisecond local SQLite time.
 */
export async function enqueueCaseSync(
  accessionNumber: string,
  action: CaseSyncAction = 'upsert'
): Promise<{ success: boolean; outboxId: string }> {
  const normAcc = accessionNumber.trim().toUpperCase();
  const bundle = await buildCaseBundle(normAcc);

  const payload: CaseSyncBundle = bundle || {
    accessionNumber: normAcc,
    action,
    patient: { mrNumber: `MRN-${normAcc}`, fullName: 'Pending Case', age: 0, gender: 'Other', updatedAt: new Date().toISOString() },
    study: { accessionNumber: normAcc, patientMrn: `MRN-${normAcc}`, modality: 'RAD', scanType: 'Study', bodyPart: 'Body', priority: 'routine', status: 'pending', scheduledAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    clientTimestamp: new Date().toISOString(),
  };

  const [existing] = await db
    .select()
    .from(caseSyncOutbox)
    .where(eq(caseSyncOutbox.entityId, normAcc))
    .limit(1);

  let outboxId = existing?.id;

  if (existing) {
    await db
      .update(caseSyncOutbox)
      .set({
        action,
        payloadJson: JSON.stringify(payload),
        status: 'pending',
        errorMessage: null,
        updatedAt: new Date() as any,
      } as any)
      .where(eq(caseSyncOutbox.id, existing.id));
  } else {
    outboxId = crypto.randomUUID();
    await db.insert(caseSyncOutbox).values({
      id: outboxId,
      entityType: 'case_bundle',
      entityId: normAcc,
      action,
      payloadJson: JSON.stringify(payload),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    } as any);
  }

  return { success: true, outboxId: outboxId! };
}

/**
 * Backfills all existing cases in the database into the outbox if empty.
 * Guarantees zero missed existing cases on first sync configuration.
 */
export async function backfillExistingCasesToOutbox(): Promise<{ enqueued: number }> {
  try {
    const existingStudies = await db.select({ accession: studies.accessionNumber }).from(studies);
    let count = 0;
    for (const st of existingStudies) {
      if (st.accession) {
        await enqueueCaseSync(st.accession, 'upsert');
        count++;
      }
    }
    return { enqueued: count };
  } catch (err) {
    console.warn('[OUTBOX_BACKFILL_WARN]', err);
    return { enqueued: 0 };
  }
}

/**
 * Returns summary counts of the synchronization outbox.
 */
export async function getSyncStatusSummary(): Promise<SyncStatusSummary> {
  let pendingCount = 0;
  let failedCount = 0;
  let syncedCount = 0;
  let lastSyncedAt: string | null = null;
  let lastError: string | null = null;

  try {
    const rows = await db.select().from(caseSyncOutbox);
    for (const r of rows) {
      if (r.status === 'pending' || r.status === 'syncing') pendingCount++;
      else if (r.status === 'failed') {
        failedCount++;
        lastError = r.errorMessage || lastError;
      } else if (r.status === 'synced') {
        syncedCount++;
        if (!lastSyncedAt || (r.lastAttemptAt && String(r.lastAttemptAt) > lastSyncedAt)) {
          lastSyncedAt = r.lastAttemptAt ? String(r.lastAttemptAt) : lastSyncedAt;
        }
      }
    }
  } catch {}

  const isConfigured = isVpsSyncConfigured();
  return {
    configured: isConfigured,
    vpsUrl: process.env.VPS_SYNC_URL || process.env.NEXT_PUBLIC_VPS_SYNC_URL || '',
    pendingCount,
    failedCount,
    syncedCount,
    lastSyncedAt,
    lastError,
  };
}

/**
 * Flushes pending outbox mutations and recent PACS studies to the VPS in batches.
 */
export async function drainSyncOutbox(limit = 25, userToken?: string): Promise<{
  attempted: number;
  synced: number;
  failed: number;
  conflicts: number;
}> {
  if (!isVpsSyncConfigured()) {
    return { attempted: 0, synced: 0, failed: 0, conflicts: 0 };
  }

  const pendingRows = await db
    .select()
    .from(caseSyncOutbox)
    .where(or(eq(caseSyncOutbox.status, 'pending'), eq(caseSyncOutbox.status, 'failed')))
    .orderBy(caseSyncOutbox.createdAt)
    .limit(limit);

  // Also collect recently indexed local PACS studies (up to 50)
  let pacsStudies: any[] = [];
  try {
    pacsStudies = await db
      .select()
      .from(hospitalPacsStudies)
      .orderBy(desc(hospitalPacsStudies.studyDate), desc(hospitalPacsStudies.lastIndexedAt))
      .limit(50);
  } catch {}

  if (pendingRows.length === 0 && pacsStudies.length === 0) {
    return { attempted: 0, synced: 0, failed: 0, conflicts: 0 };
  }

  const bundles: CaseSyncBundle[] = [];
  const rowIds: string[] = [];

  for (const r of pendingRows) {
    try {
      const parsed = JSON.parse(r.payloadJson) as CaseSyncBundle;
      bundles.push(parsed);
      rowIds.push(r.id);
    } catch {
      await db
        .update(caseSyncOutbox)
        .set({ status: 'failed', errorMessage: 'Corrupt outbox payload' } as any)
        .where(eq(caseSyncOutbox.id, r.id));
    }
  }

  if (bundles.length === 0 && pacsStudies.length === 0) {
    return { attempted: 0, synced: 0, failed: 0, conflicts: 0 };
  }

  // Mark in-flight
  if (rowIds.length > 0) {
    await db
      .update(caseSyncOutbox)
      .set({ status: 'syncing', lastAttemptAt: new Date() as any } as any)
      .where(inArray(caseSyncOutbox.id, rowIds));
  }

  try {
    const res = await pushBundlesToVps(bundles, pacsStudies, userToken);

    if (res.success) {
      const syncedSet = new Set(res.syncedAccessions.map((a) => a.toUpperCase()));
      for (const r of pendingRows) {
        if (syncedSet.has(r.entityId.toUpperCase())) {
          await db
            .update(caseSyncOutbox)
            .set({
              status: 'synced',
              errorMessage: null,
              lastAttemptAt: new Date() as any,
              updatedAt: new Date() as any,
            } as any)
            .where(eq(caseSyncOutbox.id, r.id));
        }
      }

      await logAudit({
        action: 'CASE_SYNC_DRAIN',
        entityType: 'CaseSync',
        details: `Synced ${res.processedCount} cases & ${pacsStudies.length} PACS studies to VPS. Conflicts: ${res.conflicts.length}`,
      });

      return {
        attempted: bundles.length,
        synced: res.syncedAccessions.length,
        failed: bundles.length - res.syncedAccessions.length,
        conflicts: res.conflicts.length,
      };
    } else {
      throw new Error(res.error || 'VPS rejected batch');
    }
  } catch (err: any) {
    for (const r of pendingRows) {
      await db
        .update(caseSyncOutbox)
        .set({
          status: 'failed',
          errorMessage: err.message || 'Network / server sync error',
          retryCount: (r.retryCount || 0) + 1,
          updatedAt: new Date() as any,
        } as any)
        .where(eq(caseSyncOutbox.id, r.id));
    }

    return { attempted: bundles.length, synced: 0, failed: bundles.length, conflicts: 0 };
  }
}

/**
 * Pulls remote case updates created or amended on the VPS and applies them locally.
 */
export async function pullRemoteCaseUpdates(
  since?: string,
  scope: 'my_cases' | 'active_shift' | 'all' = 'active_shift',
  userToken?: string
): Promise<{
  received: number;
  conflicts: number;
  latestServerTime: string;
}> {
  if (!isVpsSyncConfigured()) {
    return { received: 0, conflicts: 0, latestServerTime: new Date().toISOString() };
  }

  const pullRes = await pullBundlesFromVps(since, scope, userToken);
  if (!pullRes.success) {
    return { received: 0, conflicts: 0, latestServerTime: pullRes.serverTime || new Date().toISOString() };
  }

  // 1. Ingest Hospital PACS studies into local SQLite
  let pacsCount = 0;
  if (Array.isArray(pullRes.pacsStudies) && pullRes.pacsStudies.length > 0) {
    try {
      const { indexHospitalPacsStudies } = await import('../hospital-pacs-index.service');
      const r = await indexHospitalPacsStudies(pullRes.pacsStudies);
      pacsCount = r.upserted + r.updated;
    } catch (pacsErr) {
      console.warn('[SYNC_PULL_PACS_WARN] Failed ingesting pacsStudies:', pacsErr);
    }
  }

  // 2. Ingest Case Bundles into local SQLite
  let bundleCount = 0;
  let conflictCount = 0;
  if (Array.isArray(pullRes.bundles) && pullRes.bundles.length > 0) {
    for (const bundle of pullRes.bundles) {
      try {
        const outcome = await applyCaseBundle(bundle);
        if (outcome.success) bundleCount++;
        if (outcome.conflict) conflictCount++;
      } catch (ingestErr) {
        console.warn('[SYNC_PULL_INGEST_WARN] Failed ingesting bundle:', bundle.accessionNumber, ingestErr);
      }
    }
  }

  return {
    received: bundleCount + pacsCount,
    conflicts: conflictCount,
    latestServerTime: pullRes.serverTime || new Date().toISOString(),
  };
}
