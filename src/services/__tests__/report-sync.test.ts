import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncRegistry,
  dispatchReportSync,
  getRegisteredProvidersInfo,
  testSyncProvider,
  getReportSyncOutboxHistory,
} from '../report-sync/report-sync-dispatcher.service';
import { SqliteVaultProvider } from '../report-sync/providers/sqlite-vault.provider';
import { S3ReportProvider } from '../report-sync/providers/s3-report.provider';
import { PostgresMirrorProvider } from '../report-sync/providers/postgres.provider';
import { GoogleDocsProvider } from '../report-sync/providers/gdocs.provider';
import { IReportSyncProvider, SyncReportPayload, SyncResult } from '@/types/sync-provider';
import { db } from '@/db';
import { reports, studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Pluggable Multi-Destination Report Sync Engine', () => {
  let mockPatientId: string;
  let mockStudyId: string;
  let mockReportId: string;
  let mockAccession: string;

  beforeEach(async () => {
    mockPatientId = crypto.randomUUID();
    mockStudyId = crypto.randomUUID();
    mockReportId = crypto.randomUUID();
    mockAccession = `ACC_SYNC_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Seed test patient
    await db.insert(patients).values({
      id: mockPatientId,
      mrNumber: `MRN_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      fullName: 'Muhammad Ahmad Test',
      age: 48,
      gender: 'Male',
      createdAt: new Date() as any,
    } as any);

    // Seed test study
    await db.insert(studies).values({
      id: mockStudyId,
      patientId: mockPatientId,
      accessionNumber: mockAccession,
      modality: 'MR',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'Spine',
      status: 'scheduled',
      scheduledAt: new Date() as any,
      createdAt: new Date() as any,
    } as any);

    // Seed test report
    await db.insert(reports).values({
      id: mockReportId,
      studyId: mockStudyId,
      patientId: mockPatientId,
      status: 'final',
      clinicalHistory: 'Chronic L5-S1 radiculopathy',
      findings: 'L5-S1 broad-based disc bulge with left neural foraminal narrowing.',
      impression: 'L5-S1 disc herniation impinging the exiting left L5 nerve root.',
      recommendation: 'Clinical correlation and spine clinic evaluation.',
      criticalFinding: false,
      signedBy: 'Dr. J. Doe, Consultant Radiologist',
      signedAt: new Date() as any,
      authorId: 'test-user-id',
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
    } as any);
  });

  it('1. verifies that all canonical providers are registered in the sync registry', () => {
    const providers = syncRegistry.getAll();
    expect(providers.length).toBeGreaterThanOrEqual(4);

    const providerIds = providers.map((p) => p.id);
    expect(providerIds).toContain('sqlite_vault');
    expect(providerIds).toContain('s3_archive');
    expect(providerIds).toContain('postgres_mirror');
    expect(providerIds).toContain('google_docs');
  });

  it('2. verifies SqliteVaultProvider local connectivity probe and sync execution', async () => {
    const sqliteProvider = new SqliteVaultProvider();
    expect(sqliteProvider.isEnabled()).toBe(true);

    const testConn = await sqliteProvider.testConnection();
    expect(testConn.success).toBe(true);
    expect(testConn.latencyMs).toBeGreaterThanOrEqual(0);

    const result = await sqliteProvider.pushReport({
      reportId: mockReportId,
      accessionNumber: mockAccession,
      patientMrn: 'MRN_TEST',
      patientName: 'Test Patient',
      modality: 'MR',
      studyDescription: 'MRI Lumbar Spine',
      findings: 'Normal exam',
      impression: 'No acute abnormality',
      status: 'final',
    });

    expect(result.success).toBe(true);
    expect(result.providerId).toBe('sqlite_vault');
    expect(result.status).toBe('synced');
    expect(result.targetRef).toBe(`local://${mockReportId}`);
  });

  it('3. verifies S3ReportProvider handles unconfigured and configured states gracefully', async () => {
    const s3Provider = new S3ReportProvider();
    const testConn = await s3Provider.testConnection();
    // In test environment without active S3 mock credentials, it fails gracefully without throwing
    expect(testConn).toHaveProperty('success');
    expect(testConn).toHaveProperty('latencyMs');
  });

  it('4. verifies PostgresMirrorProvider handles missing connection string gracefully', async () => {
    const pgProvider = new PostgresMirrorProvider();
    const isEnabled = pgProvider.isEnabled();
    const testConn = await pgProvider.testConnection();

    if (!isEnabled) {
      expect(testConn.success).toBe(false);
      expect(testConn.message).toContain('PostgreSQL sync is disabled');
    }
  });

  it('5. verifies GoogleDocsProvider handles unlinked accounts gracefully without crashing', async () => {
    const gdocsProvider = new GoogleDocsProvider();
    const enabled = await gdocsProvider.isEnabled('unlinked-user-123');
    expect(enabled).toBe(false);

    const pushRes = await gdocsProvider.pushReport({
      reportId: mockReportId,
      accessionNumber: mockAccession,
      patientMrn: 'MRN_TEST',
      patientName: 'Test Patient',
      modality: 'MR',
      studyDescription: 'MRI Lumbar Spine',
      status: 'final',
      authorId: 'unlinked-user-123',
    });

    expect(pushRes.success).toBe(true);
    expect(pushRes.status).toBe('skipped');
  });

  it('6. verifies custom third-party provider dynamic plug-and-play capability', async () => {
    const customSyncResults: string[] = [];

    class CustomHospitalWebhookProvider implements IReportSyncProvider {
      readonly id = 'custom_webhook';
      readonly name = 'Custom HL7 / Webhook';
      readonly description = 'Transmits signed reports to external clinic EMR';

      isEnabled() {
        return true;
      }
      async testConnection() {
        return { success: true, latencyMs: 12, message: 'Webhook endpoint OK' };
      }
      async pushReport(payload: SyncReportPayload): Promise<SyncResult> {
        customSyncResults.push(payload.accessionNumber);
        return {
          success: true,
          providerId: this.id,
          status: 'synced',
          targetRef: `https://emr.hospital.com/reports/${payload.accessionNumber}`,
          syncedAt: new Date().toISOString(),
        };
      }
    }

    syncRegistry.register(new CustomHospitalWebhookProvider());

    const providers = await getRegisteredProvidersInfo();
    expect(providers.map((p) => p.id)).toContain('custom_webhook');

    const testRes = await testSyncProvider('custom_webhook');
    expect(testRes.success).toBe(true);
    expect(testRes.latencyMs).toBe(12);
  });

  it('7. verifies dispatchReportSync durable outbox persistence and non-blocking multi-sync', async () => {
    const outcome = await dispatchReportSync(mockReportId, 'test-user-id');
    expect(outcome.queuedCount).toBeGreaterThanOrEqual(1);

    // Verify outbox log rows were inserted for this report
    const history = await getReportSyncOutboxHistory(mockReportId);
    expect(history.length).toBeGreaterThanOrEqual(1);

    const sqliteOutbox = history.find((h) => h.providerId === 'sqlite_vault');
    expect(sqliteOutbox).toBeDefined();
    expect(sqliteOutbox?.status).toBe('synced');
    expect(sqliteOutbox?.accessionNumber).toBe(mockAccession);
  });
});
