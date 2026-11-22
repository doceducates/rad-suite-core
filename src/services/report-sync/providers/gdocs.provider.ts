import { IReportSyncProvider, SyncReportPayload, SyncResult, ProviderConnectionStatus } from '@/types/sync-provider';
import { syncReportToGoogleDocs } from '@/services/google-docs-sync.service';
import { getUserGoogleStatus } from '@/services/google-auth.service';

/**
 * Google Docs & Drive Provider
 * Formats diagnostic report into formatted clinical HTML/Google Doc and saves in Google Drive.
 */
export class GoogleDocsProvider implements IReportSyncProvider {
  readonly id = 'google_docs';
  readonly name = 'Google Docs & Drive';
  readonly description = 'Clinical report formatted into native Google Doc in Google Drive';

  async isEnabled(userId?: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const status = await getUserGoogleStatus(userId);
      return Boolean(status.isConnected && status.autoSync);
    } catch {
      return false;
    }
  }

  async testConnection(userId?: string): Promise<ProviderConnectionStatus> {
    const t0 = Date.now();
    if (!process.env.GOOGLE_CLIENT_ID) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Google OAuth not configured (missing GOOGLE_CLIENT_ID)',
      };
    }

    if (!userId) {
      return {
        success: true,
        latencyMs: Date.now() - t0,
        message: 'Google Docs OAuth Client ID configured on server.',
      };
    }

    try {
      const status = await getUserGoogleStatus(userId);
      return {
        success: status.isConnected,
        latencyMs: Date.now() - t0,
        message: status.isConnected
          ? `Connected to Google Drive (${status.email || 'OAuth Token Valid'})`
          : 'User has not linked Google Account',
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - t0,
        message: 'Google Drive check failed',
        error: err.message,
      };
    }
  }

  async pushReport(payload: SyncReportPayload): Promise<SyncResult> {
    const t0 = Date.now();
    if (!payload.authorId) {
      return {
        success: true,
        providerId: this.id,
        status: 'skipped',
        syncedAt: new Date().toISOString(),
      };
    }

    try {
      const enabled = await this.isEnabled(payload.authorId);
      if (!enabled) {
        return {
          success: true,
          providerId: this.id,
          status: 'skipped',
          syncedAt: new Date().toISOString(),
        };
      }

      const res = await syncReportToGoogleDocs({
        reportId: payload.reportId,
        userId: payload.authorId,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed uploading to Google Docs');
      }

      return {
        success: true,
        providerId: this.id,
        status: 'synced',
        targetRef: res.googleDocUrl || res.googleDocId,
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
