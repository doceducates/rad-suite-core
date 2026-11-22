// Layer 2: Sync Change Ledger Service (CDC & Sequence Tracking)
import { db } from '@/db';
import { syncChangelog } from '@/db/schema/sync-changelog';
import { gt, desc, asc } from 'drizzle-orm';
import { syncBroadcaster, type SyncStreamEvent } from './sync-stream-broadcaster';

export interface RecordChangeParams {
  tableName: 'cases' | 'studies' | 'reports' | 'hmis_draft_vault' | 'hospital_pacs_studies' | 'patients';
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  dataSummary?: Record<string, any>;
  actorId?: string;
}

/**
 * Records a mutation into the append-only sync_changelog table and immediately broadcasts
 * an event over the SSE stream to all connected client devices (laptops, iPads, mobile apps).
 */
export async function recordSyncChange(params: RecordChangeParams): Promise<number | undefined> {
  const nowIso = new Date().toISOString();
  let insertedId: number | undefined;

  try {
    const dataJson = params.dataSummary ? JSON.stringify(params.dataSummary) : null;
    const [inserted] = await db
      .insert(syncChangelog)
      .values({
        tableName: params.tableName,
        entityId: params.entityId,
        operation: params.operation,
        dataJson,
        actorId: params.actorId || 'system',
        changedAt: nowIso as any,
      } as any)
      .returning({ id: syncChangelog.id });

    insertedId = inserted?.id;
  } catch (err) {
    console.warn('[SYNC_CHANGELOG_WARN] Failed recording changelog entry:', err);
  }

  // Reactive Fanout (< 50ms latency to all online clients)
  const streamEvent: SyncStreamEvent = {
    sequenceId: insertedId,
    tableName: params.tableName,
    entityId: params.entityId,
    operation: params.operation,
    changedAt: nowIso,
    dataSummary: params.dataSummary,
  };

  syncBroadcaster.broadcast(streamEvent);
  return insertedId;
}

/**
 * Retrieves delta change log records newer than a specified monotonic sequence id.
 */
export async function getChangelogSince(sinceSeq = 0, limit = 50) {
  try {
    const records = await db
      .select()
      .from(syncChangelog)
      .where(gt(syncChangelog.id, sinceSeq))
      .orderBy(asc(syncChangelog.id))
      .limit(limit);

    return records;
  } catch (err) {
    console.warn('[SYNC_CHANGELOG_WARN] Error querying changelog since seq:', sinceSeq, err);
    return [];
  }
}
