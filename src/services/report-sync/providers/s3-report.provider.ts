import { IReportSyncProvider, SyncReportPayload, SyncResult, ProviderConnectionStatus } from '@/types/sync-provider';
import { getEffectiveS3Credentials, buildS3Url, getSigV4Headers, s3HttpGet } from '@/services/s3-client';
import { uploadReportToS3 } from '@/services/s3-case.service';

/**
 * Cloud S3 Archive Provider
 * Replicates diagnostic reports in JSON & PDF formats to S3-compatible cloud object storage.
 */
export class S3ReportProvider implements IReportSyncProvider {
  readonly id = 's3_archive';
  readonly name = 'Cloud S3 Report Vault';
  readonly description = 'Deterministic cloud archive in S3 bucket (reports/YYYY/MM/MOD/ACC)';

  isEnabled(): boolean {
    const creds = getEffectiveS3Credentials();
    return Boolean(creds.enabled && creds.bucket && creds.endpoint);
  }

  async testConnection(): Promise<ProviderConnectionStatus> {
    const t0 = Date.now();
    const creds = getEffectiveS3Credentials();
    if (!creds.bucket || !creds.endpoint) {
      return {
        success: false,
        latencyMs: 0,
        message: 'S3 storage is unconfigured (missing bucket or endpoint)',
      };
    }

    try {
      const listUrl = buildS3Url(creds, '', { 'list-type': '2', 'max-keys': '1' });
      let headers: Record<string, string> = {};
      if (creds.accessKeyId && creds.secretAccessKey) {
        headers = getSigV4Headers('GET', listUrl, creds.region, creds.accessKeyId, creds.secretAccessKey);
      }

      const res = await s3HttpGet(listUrl, headers, 5000);
      if (res.ok) {
        return {
          success: true,
          latencyMs: Date.now() - t0,
          message: `S3 Object Store verified: bucket "${creds.bucket}" reachable.`,
        };
      }
      return {
        success: false,
        latencyMs: Date.now() - t0,
        message: `S3 HTTP ${res.status}: probe failed.`,
        error: await res.text(),
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - t0,
        message: 'S3 Connection failed',
        error: err.message,
      };
    }
  }

  async pushReport(payload: SyncReportPayload): Promise<SyncResult> {
    const t0 = Date.now();
    if (!this.isEnabled()) {
      return {
        success: true,
        providerId: this.id,
        status: 'skipped',
        syncedAt: new Date().toISOString(),
      };
    }

    try {
      // 1. Prepare clinical JSON report snapshot
      const reportJson = JSON.stringify(payload, null, 2);

      const res = await uploadReportToS3({
        accessionNumber: payload.accessionNumber,
        patientName: payload.patientName,
        modality: payload.modality,
        reportDate: payload.studyDate ? String(payload.studyDate) : undefined,
        content: reportJson,
        format: 'json',
        version: payload.version,
      });

      if (!res.success) {
        throw new Error('S3 uploader rejected the report payload');
      }

      return {
        success: true,
        providerId: this.id,
        status: 'synced',
        targetRef: res.versionKey || res.s3Key || `s3://${payload.accessionNumber}`,
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
