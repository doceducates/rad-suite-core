import { IReportSyncProvider, SyncReportPayload, SyncResult, ProviderConnectionStatus } from '@/types/sync-provider';
import { Pool } from 'pg';

let remotePgPool: Pool | null = null;

function getRemotePgPool(): Pool | null {
  const connString = process.env.POSTGRES_SYNC_URL || (process.env.DB_DIALECT === 'sqlite' ? process.env.DATABASE_URL : null);
  if (!connString || connString.includes('localhost:5435/rad_suite')) {
    // If not explicitly configured or points to dummy default, disable remote PG
    if (!process.env.POSTGRES_SYNC_URL) return null;
  }

  if (!remotePgPool && connString) {
    remotePgPool = new Pool({
      connectionString: connString,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 10000,
      max: 5,
    });
  }
  return remotePgPool;
}

/**
 * Remote PostgreSQL Mirror Provider
 * Replicates finalized and amended diagnostic reports into a remote relational database.
 */
export class PostgresMirrorProvider implements IReportSyncProvider {
  readonly id = 'postgres_mirror';
  readonly name = 'Remote PostgreSQL Mirror';
  readonly description = 'Central hospital / VPS PostgreSQL database sync';

  isEnabled(): boolean {
    return Boolean(getRemotePgPool());
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const t0 = Date.now();
    const pool = getRemotePgPool();
    if (!pool) {
      return {
        success: false,
        latencyMs: 0,
        message: 'PostgreSQL sync is disabled (POSTGRES_SYNC_URL not configured)',
      };
    }

    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        return {
          success: true,
          latencyMs: Date.now() - t0,
          message: 'Remote PostgreSQL server connected and operational.',
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - t0,
        message: 'PostgreSQL connection failed',
        error: err.message,
      };
    }
  }

  async pushReport(payload: SyncReportPayload): Promise<SyncResult> {
    const t0 = Date.now();
    const pool = getRemotePgPool();
    if (!pool) {
      return {
        success: true,
        providerId: this.id,
        status: 'skipped',
        syncedAt: new Date().toISOString(),
      };
    }

    try {
      const client = await pool.connect();
      try {
        // Ensure remote sync table exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS remote_synced_reports (
            id TEXT PRIMARY KEY,
            accession_number TEXT NOT NULL,
            patient_mrn TEXT NOT NULL,
            patient_name TEXT NOT NULL,
            modality TEXT NOT NULL,
            study_description TEXT,
            status TEXT NOT NULL,
            findings TEXT,
            impression TEXT,
            recommendations TEXT,
            critical_finding BOOLEAN DEFAULT FALSE,
            signed_by TEXT,
            signed_at TIMESTAMP,
            synced_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_remote_sync_acc ON remote_synced_reports(accession_number);
        `);

        // Parameterized upsert
        await client.query(
          `INSERT INTO remote_synced_reports (
            id, accession_number, patient_mrn, patient_name, modality,
            study_description, status, findings, impression, recommendations,
            critical_finding, signed_by, signed_at, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            findings = EXCLUDED.findings,
            impression = EXCLUDED.impression,
            recommendations = EXCLUDED.recommendations,
            critical_finding = EXCLUDED.critical_finding,
            signed_by = EXCLUDED.signed_by,
            signed_at = EXCLUDED.signed_at,
            synced_at = NOW();`,
          [
            payload.reportId,
            payload.accessionNumber,
            payload.patientMrn,
            payload.patientName,
            payload.modality,
            payload.studyDescription,
            payload.status,
            payload.findings || '',
            payload.impression || '',
            payload.recommendations || '',
            Boolean(payload.criticalFinding),
            payload.signedBy || null,
            payload.signedAt ? new Date(payload.signedAt) : null,
          ]
        );

        return {
          success: true,
          providerId: this.id,
          status: 'synced',
          targetRef: `pg://${payload.accessionNumber}`,
          latencyMs: Date.now() - t0,
          syncedAt: new Date().toISOString(),
        };
      } finally {
        client.release();
      }
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
