import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { db } from '@/db';
import { patients, studies, caseSyncOutbox } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  enqueueCaseSync,
  getSyncStatusSummary,
  backfillExistingCasesToOutbox,
  drainSyncOutbox,
} from '../sync/case-sync-outbox.service';

describe('Case Sync Outbox Queue & Orchestration', () => {
  let testAccession: string;
  let testMrn: string;

  beforeEach(async () => {
    testAccession = `ACC_OUTBOX_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    testMrn = `MRN_OUTBOX_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const patId = crypto.randomUUID();
    await db.insert(patients).values({
      id: patId,
      mrNumber: testMrn,
      fullName: 'Outbox Test Patient',
      age: 50,
      gender: 'Male',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await db.insert(studies).values({
      id: crypto.randomUUID(),
      patientId: patId,
      accessionNumber: testAccession,
      modality: 'XR',
      scanType: 'Chest PA',
      bodyPart: 'Chest',
      status: 'scheduled',
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  it('1. enqueues an accession mutation to case_sync_outbox in pending state', async () => {
    const res = await enqueueCaseSync(testAccession, 'upsert');
    expect(res.success).toBe(true);
    expect(res.outboxId).toBeDefined();

    const [row] = await db.select().from(caseSyncOutbox).where(eq(caseSyncOutbox.id, res.outboxId)).limit(1);
    expect(row).toBeDefined();
    expect(row.status).toBe('pending');
    expect(row.entityId).toBe(testAccession);

    const parsed = JSON.parse(row.payloadJson);
    expect(parsed.accessionNumber).toBe(testAccession);
    expect(parsed.patient.fullName).toBe('Outbox Test Patient');
  });

  it('2. updates existing outbox row rather than duplicating when modified again while offline', async () => {
    const res1 = await enqueueCaseSync(testAccession, 'upsert');
    const res2 = await enqueueCaseSync(testAccession, 'upsert');

    expect(res1.outboxId).toBe(res2.outboxId);

    const rows = await db.select().from(caseSyncOutbox).where(eq(caseSyncOutbox.entityId, testAccession));
    expect(rows.length).toBe(1);
  });

  it('3. returns accurate sync status summary counts', async () => {
    const summary = await getSyncStatusSummary();
    expect(summary).toBeDefined();
    expect(typeof summary.pendingCount).toBe('number');
    expect(typeof summary.syncedCount).toBe('number');
    expect(typeof summary.failedCount).toBe('number');
  });

  it('4. backfills existing database studies into outbox for initial sync seeding', async () => {
    const backfill = await backfillExistingCasesToOutbox();
    expect(backfill.enqueued).toBeGreaterThanOrEqual(1);

    const [row] = await db.select().from(caseSyncOutbox).where(eq(caseSyncOutbox.entityId, testAccession)).limit(1);
    expect(row).toBeDefined();
    expect(row.status).toBe('pending');
  });

  it('5. gracefully handles drainSyncOutbox when remote VPS is unconfigured', async () => {
    delete process.env.VPS_SYNC_URL;
    delete process.env.CLINIC_GATEWAY_URL;

    const result = await drainSyncOutbox(10);
    expect(result.attempted).toBe(0);
    expect(result.synced).toBe(0);
  });
});
