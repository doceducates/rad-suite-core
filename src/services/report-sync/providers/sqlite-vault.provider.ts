import { IReportSyncProvider, SyncReportPayload, SyncResult, ProviderConnectionStatus } from '@/types/sync-provider';
import { db, IS_SQLITE, sqlite } from '@/db';
import { reports } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Local Vault Provider (SQLite)
 * Primary durable local report store with sub-millisecond response.
 */
export class SqliteVaultProvider implements IReportSyncProvider {
  readonly id = 'sqlite_vault';
  readonly name = 'Local SQLite Vault';
  readonly description = 'Durable primary storage on the workstation disk (radsuite.db)';

  isEnabled(): boolean {
    return true; // Always active as primary durable storage
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const t0 = Date.now();
    try {
      if (IS_SQLITE && sqlite) {
        sqlite.prepare('SELECT 1').get();
      } else {
        await db.select().from(reports).limit(1);
      }
      return {
        success: true,
        latencyMs: Date.now() - t0,
        message: 'Local SQLite database connected and responsive.',
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - t0,
        message: 'Failed querying local database',
        error: err.message,
      };
    }
  }

  async pushReport(payload: SyncReportPayload): Promise<SyncResult> {
    const t0 = Date.now();
    try {
      // Local vault verification
      const [rec] = await db.select().from(reports).where(eq(reports.id, payload.reportId)).limit(1);
      return {
        success: Boolean(rec),
        providerId: this.id,
        status: rec ? 'synced' : 'failed',
        targetRef: `local://${payload.reportId}`,
        latencyMs: Date.now() - t0,
        syncedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        providerId: this.id,
        status: 'failed',
        error: err.message,
        latencyMs: Date.now() - t0,
        syncedAt: new Date().toISOString(),
      };
    }
  }
}
