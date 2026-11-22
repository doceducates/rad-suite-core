// Layer 2 (Domain/Services): Pluggable Report Multi-Destination Dispatcher
import crypto from 'crypto';
import { db } from '@/db';
import { reports, studies, patients, reportSyncOutbox, reportRevisions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { IReportSyncProvider, SyncReportPayload, SyncResult, ProviderConnectionStatus } from '@/types/sync-provider';
import { SqliteVaultProvider } from './providers/sqlite-vault.provider';
import { S3ReportProvider } from './providers/s3-report.provider';
import { PostgresMirrorProvider } from './providers/postgres.provider';
import { GoogleDocsProvider } from './providers/gdocs.provider';
import { logAudit } from '@/services/audit.service';

class ReportSyncRegistry {
  private providers: Map<string, IReportSyncProvider> = new Map();

  constructor() {
    this.register(new SqliteVaultProvider());
    this.register(new S3ReportProvider());
    this.register(new PostgresMirrorProvider());
    this.register(new GoogleDocsProvider());
  }

  register(provider: IReportSyncProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): IReportSyncProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): IReportSyncProvider[] {
    return Array.from(this.providers.values());
  }
}

export const syncRegistry = new ReportSyncRegistry();

export async function getRegisteredProvidersInfo(userId?: string) {
  const providers = syncRegistry.getAll();
  const results = [];

  for (const p of providers) {
    let enabled = false;
    try {
      enabled = Boolean(await p.isEnabled());
    } catch {
      enabled = false;
    }

    results.push({
      id: p.id,
      name: p.name,
      description: p.description,
      enabled,
    });
  }
  return results;
}

export async function testSyncProvider(providerId: string, userId?: string): Promise<ProviderConnectionStatus> {
  const provider = syncRegistry.get(providerId);
  if (!provider) {
    return {
      success: false,
      latencyMs: 0,
      message: `Unknown sync provider "${providerId}"`,
    };
  }
  return await provider.testConnection();
}

export async function dispatchReportSync(
  reportId: string,
  authorId?: string
): Promise<{ queuedCount: number; results: Record<string, SyncResult> }> {
  // 1. Gather Clinical Data for Payload
  const [rep] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!rep) {
    return { queuedCount: 0, results: {} };
  }

  let accession = 'UNKNOWN_ACC';
  let patientName = 'UNKNOWN_PATIENT';
  let patientMrn = 'UNKNOWN_MRN';
  let modality = 'RAD';
  let studyDescription = 'Radiological Examination';
  let age: number | undefined;
  let gender: string | undefined;
  let studyDate: string | undefined;

  if (rep.studyId) {
    const [st] = await db.select().from(studies).where(eq(studies.id, rep.studyId)).limit(1);
    if (st) {
      accession = st.accessionNumber;
      modality = st.modality;
      studyDescription = st.scanType || studyDescription;
      studyDate = st.scheduledAt ? String(st.scheduledAt) : undefined;

      if (st.patientId) {
        const [pat] = await db.select().from(patients).where(eq(patients.id, st.patientId)).limit(1);
        if (pat) {
          patientName = pat.fullName;
          patientMrn = pat.mrNumber;
          age = pat.age;
          gender = pat.gender;
        }
      }
    }
  }

  const payload: SyncReportPayload = {
    reportId,
    studyId: rep.studyId,
    accessionNumber: accession,
    patientMrn,
    patientName,
    age,
    gender,
    modality,
    studyDescription,
    studyDate,
    clinicalHistory: rep.clinicalHistory || '',
    technique: rep.technique || '',
    comparison: rep.comparison || '',
    findings: rep.findings || '',
    impression: rep.impression || '',
    recommendations: (rep as any).recommendations || (rep as any).recommendation || '',
    criticalFinding: Boolean(rep.criticalFinding),
    status: rep.status,
    signedBy: rep.signedBy || '',
    signedAt: rep.signedAt ? String(rep.signedAt) : undefined,
    authorId: rep.authorId || authorId,
    version: await (async () => {
      try {
        const [rev] = await db
          .select({ version: reportRevisions.version })
          .from(reportRevisions)
          .where(eq(reportRevisions.reportId, reportId))
          .orderBy(desc(reportRevisions.version))
          .limit(1);
        return rev?.version ?? 1;
      } catch {
        return 1;
      }
    })(),
    updatedAt: rep.updatedAt ? String(rep.updatedAt) : new Date().toISOString(),
  };

  const providers = syncRegistry.getAll();
  const results: Record<string, SyncResult> = {};
  let queuedCount = 0;

  // 2. Dispatches concurrently across all enabled providers
  await Promise.all(
    providers.map(async (provider) => {
      let isEnabled = false;
      try {
        isEnabled = await provider.isEnabled();
      } catch {
        isEnabled = false;
      }

      if (!isEnabled && provider.id !== 'sqlite_vault') {
        return;
      }

      queuedCount++;
      const outboxId = crypto.randomUUID();

      // Record outbox row as pending
      try {
        await db.insert(reportSyncOutbox).values({
          id: outboxId,
          reportId,
          accessionNumber: accession,
          providerId: provider.id,
          status: 'pending',
          createdAt: new Date() as any,
        } as any);
      } catch {}

      // Execute provider push
      try {
        const res = await provider.pushReport(payload);
        results[provider.id] = res;

        // Update outbox with outcome
        try {
          await db
            .update(reportSyncOutbox)
            .set({
              status: res.status,
              targetRef: res.targetRef || null,
              errorMessage: res.error || null,
              syncedAt: (res.syncedAt ? new Date(res.syncedAt) : new Date()) as any,
            } as any)
            .where(eq(reportSyncOutbox.id, outboxId));
        } catch {}
      } catch (err: any) {
        results[provider.id] = {
          success: false,
          providerId: provider.id,
          status: 'failed',
          error: err.message,
          syncedAt: new Date().toISOString(),
        };

        try {
          await db
            .update(reportSyncOutbox)
            .set({
              status: 'failed',
              errorMessage: err.message,
            } as any)
            .where(eq(reportSyncOutbox.id, outboxId));
        } catch {}
      }
    })
  );

  await logAudit({
    userId: authorId || 'system',
    userName: 'Report Sync Dispatcher',
    action: 'REPORT_MULTI_SYNC',
    entityType: 'Report',
    entityId: reportId,
    details: `Dispatched sync to ${queuedCount} providers for accession ${accession}. Success: ${
      Object.values(results).filter((r) => r.success).length
    }`,
  });

  return { queuedCount, results };
}

export async function getReportSyncOutboxHistory(reportId: string) {
  try {
    return await db
      .select()
      .from(reportSyncOutbox)
      .where(eq(reportSyncOutbox.reportId, reportId))
      .orderBy(desc(reportSyncOutbox.createdAt));
  } catch {
    return [];
  }
}
