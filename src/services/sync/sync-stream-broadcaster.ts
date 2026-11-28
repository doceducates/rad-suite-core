// Layer 2: Real-time Multi-Device Sync Stream Broadcaster (SSE)
import { EventEmitter } from 'events';
import { serverTtlCache } from '@/lib/server-ttl-cache';

export interface SyncStreamEvent {
  sequenceId?: number;
  tableName: string;
  entityId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changedAt: string;
  dataSummary?: Record<string, any>;
}

class SyncStreamBroadcaster extends EventEmitter {
  private activeClients = new Set<(event: SyncStreamEvent) => void>();

  public subscribe(listener: (event: SyncStreamEvent) => void): () => void {
    this.activeClients.add(listener);
    return () => {
      this.activeClients.delete(listener);
    };
  }

  public broadcast(event: SyncStreamEvent): void {
    // Immediately invalidate server-side dashboard/telemetry TTL caches on relevant mutations
    if (
      event.tableName === 'reports' ||
      event.tableName === 'studies' ||
      event.tableName === 'patients' ||
      event.tableName === 'hmis_draft_vault' ||
      event.tableName === 'hospital_pacs_studies'
    ) {
      serverTtlCache.invalidatePrefix('dashboard:');
    }
    if (event.tableName === 'users' || event.tableName === 'client_workstations') {
      serverTtlCache.invalidate('telemetry:summary');
    }

    for (const listener of this.activeClients) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[SYNC_BROADCAST_ERR] Failed sending to client:', err);
      }
    }
  }

  public getSubscriberCount(): number {
    return this.activeClients.size;
  }
}

const globalForBroadcaster = globalThis as typeof globalThis & {
  __radSuiteSyncBroadcaster?: SyncStreamBroadcaster;
};

export const syncBroadcaster =
  globalForBroadcaster.__radSuiteSyncBroadcaster ?? new SyncStreamBroadcaster();

if (process.env.NODE_ENV !== 'production') {
  globalForBroadcaster.__radSuiteSyncBroadcaster = syncBroadcaster;
}
