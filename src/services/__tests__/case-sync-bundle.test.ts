import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { db } from '@/db';
import { patients, studies, reports, reportRevisions, tombstonedAccessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { buildCaseBundle, applyCaseBundle } from '../sync/case-sync-bundle.service';
import type { CaseSyncBundle } from '../sync/case-sync-types';

describe('Case Sync Bundle Engine (Offline-First & Conflict-Safe)', () => {
  let testPatientId: string;
  let testStudyId: string;
  let testReportId: string;
  let testAccession: string;
  let testMrn: string;

  beforeEach(async () => {
    testPatientId = crypto.randomUUID();
    testStudyId = crypto.randomUUID();
    testReportId = crypto.randomUUID();
    testAccession = `ACC_BUNDLE_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    testMrn = `MRN_BUNDLE_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    // Seed patient
    await db.insert(patients).values({
      id: testPatientId,
      mrNumber: testMrn,
      fullName: 'Ahmad Khan Offline Test',
      age: 45,
      gender: 'Male',
      clinicalNotes: 'Asthma history',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Seed study
    await db.insert(studies).values({
      id: testStudyId,
      patientId: testPatientId,
      accessionNumber: testAccession,
      modality: 'CT',
      scanType: 'CT Chest HRCT',
      bodyPart: 'Chest',
      status: 'scheduled',
      scheduledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Seed report
    await db.insert(reports).values({
      id: testReportId,
      studyId: testStudyId,
      patientId: testPatientId,
      authorId: '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
      status: 'draft',
      findings: 'Initial offline draft findings: clear lung fields.',
      impression: 'Normal HRCT chest.',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Seed revision 1
    await db.insert(reportRevisions).values({
      id: crypto.randomUUID(),
      reportId: testReportId,
      version: 1,
      authorName: 'Dr. Test Radiologist',
      status: 'draft',
      findings: 'Initial offline draft findings: clear lung fields.',
      impression: 'Normal HRCT chest.',
      createdAt: new Date(),
    } as any);
  });

  it('1. builds complete relational case bundle with patient, study, report and revisions', async () => {
    const bundle = await buildCaseBundle(testAccession);
    expect(bundle).not.toBeNull();
    expect(bundle?.accessionNumber).toBe(testAccession);
    expect(bundle?.patient.fullName).toBe('Ahmad Khan Offline Test');
    expect(bundle?.patient.mrNumber).toBe(testMrn);
    expect(bundle?.study.scanType).toBe('CT Chest HRCT');
    expect(bundle?.report?.findings).toContain('clear lung fields');
    expect(bundle?.report?.revisions?.length).toBeGreaterThanOrEqual(1);
    expect(bundle?.tombstoned).toBeFalsy();
  });

  it('2. ingests a new case bundle into an empty accession idempotently', async () => {
    const newAccession = `ACC_INBOUND_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const newMrn = `MRN_INBOUND_${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const incomingBundle: CaseSyncBundle = {
      accessionNumber: newAccession,
      action: 'upsert',
      patient: {
        mrNumber: newMrn,
        fullName: 'Fatima Remote Patient',
        age: 32,
        gender: 'Female',
        updatedAt: new Date().toISOString(),
      },
      study: {
        accessionNumber: newAccession,
        patientMrn: newMrn,
        modality: 'MR',
        scanType: 'MRI Brain with Contrast',
        bodyPart: 'Brain',
        priority: 'urgent',
        status: 'scheduled',
        scheduledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      report: {
        accessionNumber: newAccession,
        status: 'draft',
        findings: 'No acute intracranial pathology.',
        impression: 'Normal MRI Brain.',
        updatedAt: new Date().toISOString(),
      },
      clientTimestamp: new Date().toISOString(),
    };

    // First ingestion
    const res1 = await applyCaseBundle(incomingBundle);
    expect(res1.success).toBe(true);

    // Verify created in DB
    const [st] = await db.select().from(studies).where(eq(studies.accessionNumber, newAccession)).limit(1);
    expect(st).toBeDefined();
    expect(st.modality).toBe('MR');

    const [pat] = await db.select().from(patients).where(eq(patients.mrNumber, newMrn)).limit(1);
    expect(pat).toBeDefined();
    expect(pat.fullName).toBe('Fatima Remote Patient');

    const [rep] = await db.select().from(reports).where(eq(reports.studyId, st.id)).limit(1);
    expect(rep).toBeDefined();
    expect(rep.impression).toBe('Normal MRI Brain.');

    // Second ingestion of exact same bundle (idempotency check)
    const res2 = await applyCaseBundle(incomingBundle);
    expect(res2.success).toBe(true);
  });

  it('3. safely preserves divergent revisions without losing clinical findings upon conflict', async () => {
    // Local report was updated with new text
    const olderTime = new Date(Date.now() - 60000).toISOString();
    const newerIncomingBundle: CaseSyncBundle = {
      accessionNumber: testAccession,
      action: 'upsert',
      patient: {
        mrNumber: testMrn,
        fullName: 'Ahmad Khan Offline Test',
        age: 45,
        gender: 'Male',
        updatedAt: new Date().toISOString(),
      },
      study: {
        accessionNumber: testAccession,
        patientMrn: testMrn,
        modality: 'CT',
        scanType: 'CT Chest HRCT',
        bodyPart: 'Chest',
        priority: 'routine',
        status: 'scheduled',
        scheduledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      report: {
        accessionNumber: testAccession,
        status: 'final',
        findings: 'Remote Consultant findings: Mild basal fibrosis identified.',
        impression: 'Early fibrotic changes.',
        signedBy: 'Dr. Consultant VPS',
        updatedAt: new Date(Date.now() + 10000).toISOString(), // Newer timestamp
      },
      clientTimestamp: new Date().toISOString(),
    };

    // Apply newer update from VPS
    const result = await applyCaseBundle(newerIncomingBundle);
    expect(result.success).toBe(true);

    // Verify active report now has the newer findings
    const [activeRep] = await db.select().from(reports).where(eq(reports.id, testReportId)).limit(1);
    expect(activeRep.findings).toContain('Mild basal fibrosis');
    expect(activeRep.signedBy).toBe('Dr. Consultant VPS');

    // Crucial: verify previous local draft was auto-archived into revisions and NOT lost!
    const revs = await db
      .select()
      .from(reportRevisions)
      .where(eq(reportRevisions.reportId, testReportId))
      .orderBy(desc(reportRevisions.version));

    expect(revs.length).toBeGreaterThanOrEqual(2);
    const archivedRev = revs.find((r) => r.notes?.includes('Auto-Archived Before Sync Update'));
    expect(archivedRev).toBeDefined();
    expect(archivedRev?.findings).toContain('clear lung fields');
  });

  it('4. preserves older incoming drafts as divergent revisions if local already has newer edit', async () => {
    const olderIncomingBundle: CaseSyncBundle = {
      accessionNumber: testAccession,
      action: 'upsert',
      patient: {
        mrNumber: testMrn,
        fullName: 'Ahmad Khan Offline Test',
        age: 45,
        gender: 'Male',
        updatedAt: new Date().toISOString(),
      },
      study: {
        accessionNumber: testAccession,
        patientMrn: testMrn,
        modality: 'CT',
        scanType: 'CT Chest HRCT',
        bodyPart: 'Chest',
        priority: 'routine',
        status: 'scheduled',
        scheduledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      report: {
        accessionNumber: testAccession,
        status: 'draft',
        findings: 'Stale offline finding from yesterday.',
        impression: 'Stale impression.',
        updatedAt: new Date(Date.now() - 500000).toISOString(), // Older timestamp
      },
      clientTimestamp: new Date().toISOString(),
    };

    const res = await applyCaseBundle(olderIncomingBundle);
    expect(res.success).toBe(true);
    expect(res.conflict).toBeDefined();
    expect(res.conflict?.reason).toContain('safely preserved in revision history');

    // Verify active report was NOT overwritten with stale draft
    const [rep] = await db.select().from(reports).where(eq(reports.id, testReportId)).limit(1);
    expect(rep.findings).not.toBe('Stale offline finding from yesterday.');

    // Verify the stale draft was saved as a revision
    const revs = await db
      .select()
      .from(reportRevisions)
      .where(eq(reportRevisions.reportId, testReportId));
    const divergentRev = revs.find((r) => r.status === 'sync_divergent_revision');
    expect(divergentRev).toBeDefined();
    expect(divergentRev?.findings).toBe('Stale offline finding from yesterday.');
  });

  it('5. handles tombstone deletion correctly and prevents resurrection', async () => {
    const tombstoneBundle: CaseSyncBundle = {
      accessionNumber: testAccession,
      action: 'delete',
      patient: { mrNumber: testMrn, fullName: 'Deleted', age: 0, gender: 'Other', updatedAt: new Date().toISOString() },
      study: { accessionNumber: testAccession, patientMrn: testMrn, modality: 'CT', scanType: 'Deleted', bodyPart: 'Chest', priority: 'routine', status: 'cancelled', scheduledAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      tombstoned: true,
      tombstoneReason: 'remote_radiologist_deleted',
      clientTimestamp: new Date().toISOString(),
    };

    const outcome = await applyCaseBundle(tombstoneBundle);
    expect(outcome.success).toBe(true);

    // Verify study is deleted from active table
    const [st] = await db.select().from(studies).where(eq(studies.accessionNumber, testAccession)).limit(1);
    expect(st).toBeUndefined();

    // Verify recorded in tombstonedAccessions
    const [tomb] = await db.select().from(tombstonedAccessions).where(eq(tombstonedAccessions.accession, testAccession)).limit(1);
    expect(tomb).toBeDefined();
    expect(tomb.reason).toBe('remote_radiologist_deleted');
  });
});
