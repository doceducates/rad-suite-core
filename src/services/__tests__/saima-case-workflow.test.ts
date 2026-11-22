import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { db, sqlite, IS_SQLITE } from '@/db';
import { users, studies, reports, patients, caseShares } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ingestDicomBundle } from '../dicom-bundle-ingestion.service';
import {
  createCaseShare,
  getPublicShareMeta,
  verifyConsultantShare,
  getSharedStudyDetails,
  revokeCaseShare,
  verifyShareSessionProof,
} from '../case-share.service';

describe('Saima Patient Case: Direct Ingest & Consultant Share E2E Workflow', () => {
  let testUserId: string;
  let customCasesDir: string;
  const originalCasesDir = process.env.CASES_DIR;

  beforeEach(async () => {
    testUserId = crypto.randomUUID();
    customCasesDir = path.join(os.tmpdir(), `test_saima_cases_${Date.now()}`);
    fs.mkdirSync(customCasesDir, { recursive: true });
    process.env.CASES_DIR = customCasesDir;

    const now = new Date().toISOString();
    if (IS_SQLITE && sqlite) {
      sqlite
        .prepare(
          `INSERT INTO users (id, name, email, password_hash, role, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(testUserId, 'Dr. Muhammad Mudassir', `pgr_${Date.now()}@radsuite.pk`, 'dummy_hash', 'radiologist', now);
    } else {
      await db.insert(users).values({
        id: testUserId,
        name: 'Dr. Muhammad Mudassir',
        email: `pgr_${Date.now()}@radsuite.pk`,
        passwordHash: 'dummy_hash',
        role: 'radiologist',
        createdAt: new Date(),
      } as any);
    }
  });

  afterEach(() => {
    process.env.CASES_DIR = originalCasesDir;
    if (fs.existsSync(customCasesDir)) {
      fs.rmSync(customCasesDir, { recursive: true, force: true });
    }
  });

  it('ingests Saima case bundle, registers study and report, and creates consultant share', async () => {
    // 1. Create realistic multi-series DICOM slice buffers representing Saima's Cervical Spine MRI
    // Header includes DICM at offset 128
    const makeDcmBuffer = () => {
      const buf = Buffer.alloc(256);
      buf.write('DICM', 128);
      return buf;
    };

    const files = [
      { name: '1001_loc_001.dcm', buffer: makeDcmBuffer() },
      { name: '4001_sg_t2_001.dcm', buffer: makeDcmBuffer() },
      { name: '5001_sg_t1_001.dcm', buffer: makeDcmBuffer() },
      { name: '6001_sg_stir_001.dcm', buffer: makeDcmBuffer() },
      { name: '7001_ax_t2_001.dcm', buffer: makeDcmBuffer() },
      { name: '8001_ax_t1_001.dcm', buffer: makeDcmBuffer() },
    ];

    const ingestRes = await ingestDicomBundle(testUserId, { files });
    expect(ingestRes.success).toBe(true);
    expect(ingestRes.sliceCount).toBe(6);
    expect(ingestRes.studyId).toBeDefined();
    expect(ingestRes.accessionNumber).toBeDefined();

    const studyId = ingestRes.studyId!;

    // 2. Verify database records: study exists and has initial draft report
    const dbStudies = await db
      .select()
      .from(studies)
      .where(eq(studies.id, studyId as any))
      .limit(1);

    expect(dbStudies.length).toBe(1);
    const studyRecord = dbStudies[0];
    expect(studyRecord.assignedRadiologistId).toBe(testUserId);

    const dbReports = await db
      .select()
      .from(reports)
      .where(eq(reports.studyId, studyId as any))
      .limit(1);

    expect(dbReports.length).toBe(1);
    expect(dbReports[0].pgrAuthorId).toBe(testUserId);

    // 3. Create a consultant share link for Dr. Sadoon
    const shareRes = await createCaseShare(testUserId, {
      studyId,
      password: 'RAD-194',
      passwordHint: 'Consultant PIN',
      durationHours: 72,
    });

    expect(shareRes.token).toBeDefined();
    expect(shareRes.passwordPin).toBe('RAD-194');
    expect(shareRes.shareUrl).toContain(`/share/${shareRes.token}`);

    // 4. Pre-auth public challenge verification: Zero PHI Leakage Invariant
    const publicMeta = await getPublicShareMeta(shareRes.token);
    expect(publicMeta.status).toBe('valid');
    expect(publicMeta.passwordHint).toBe('Consultant PIN');
    expect((publicMeta as any).patientName).toBeUndefined();
    expect((publicMeta as any).mrNumber).toBeUndefined();
    expect((publicMeta as any).report).toBeUndefined();
    expect(publicMeta.studyPreview?.modality).toBe(studyRecord.modality);

    // 5. Consultant PIN Authentication Challenge
    // Case A: Incorrect PIN is rejected
    const wrongPinRes = await verifyConsultantShare(shareRes.token, 'WRONG-PIN');
    expect(wrongPinRes.success).toBe(false);
    expect(wrongPinRes.error).toContain('Invalid PIN');

    // Case B: Correct PIN is accepted and returns HMAC proof
    const correctPinRes = await verifyConsultantShare(shareRes.token, 'RAD-194');
    expect(correctPinRes.success).toBe(true);
    expect(correctPinRes.sessionProof).toBeDefined();
    expect(verifyShareSessionProof(shareRes.token, correctPinRes.sessionProof)).toBe(true);

    // 6. Authorized Consultant Portal Payload Verification
    // Without valid proof, payload retrieval throws
    await expect(getSharedStudyDetails(shareRes.token, 'invalid-proof')).rejects.toThrow(
      'Unauthorized or expired consultant session proof'
    );

    // With valid proof, payload retrieval succeeds
    const authDetails = await getSharedStudyDetails(shareRes.token, correctPinRes.sessionProof!);
    expect(authDetails.study).toBeDefined();
    expect(authDetails.study?.id).toBe(studyId);
    expect(authDetails.study?.accessionNumber).toBe(studyRecord.accessionNumber);
    expect(authDetails.report).toBeDefined();
    expect(authDetails.series).toBeDefined();

    // 7. Revocation Protection: Once revoked, link immediately reports expired/invalid
    await revokeCaseShare(shareRes.id, testUserId);

    const revokedMeta = await getPublicShareMeta(shareRes.token);
    expect(revokedMeta.status).toBe('expired_or_invalid');
    expect(revokedMeta.reason).toBe('revoked');

    await expect(getSharedStudyDetails(shareRes.token, correctPinRes.sessionProof!)).rejects.toThrow(
      'Share link is no longer active'
    );
  });

  it('validates disk slice streaming readiness for ingested case', async () => {
    const dcmHeader = Buffer.alloc(132);
    dcmHeader.write('DICM', 128);

    const ingestRes = await ingestDicomBundle(testUserId, {
      files: [{ name: 'IMG-0001.dcm', buffer: dcmHeader }],
    });

    expect(ingestRes.success).toBe(true);
    const caseTargetDir = path.join(customCasesDir, `case_${ingestRes.accessionNumber}`);
    expect(fs.existsSync(caseTargetDir)).toBe(true);

    const writtenFiles = fs.readdirSync(caseTargetDir);
    expect(writtenFiles.length).toBe(1);
    expect(writtenFiles[0]).toBe('IMG-0001.dcm');

    const sliceContent = fs.readFileSync(path.join(caseTargetDir, writtenFiles[0]));
    expect(sliceContent.subarray(128, 132).toString('ascii')).toBe('DICM');
  });
});
