import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  generateMemorablePin,
  generateShareToken,
  createShareSessionProof,
  verifyShareSessionProof,
  createCaseShare,
  getPublicShareMeta,
  verifyConsultantShare,
  revokeCaseShare,
  listSharesForStudy,
} from '@/services/case-share.service';
import { db, sqlite, IS_SQLITE } from '@/db';
import { studies, patients, caseShares } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('case-share.service', () => {
  it('generates memorable PINs matching the RAD-xxx format', () => {
    const pin = generateMemorablePin();
    expect(pin).toMatch(/^RAD-\d{3}$/);
  });

  it('generates URL-safe cryptographically secure tokens', () => {
    const token = generateShareToken();
    expect(token.length).toBeGreaterThanOrEqual(24);
    expect(token).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  describe('HMIS Session Proof Cryptography', () => {
    it('creates and verifies valid session proofs', () => {
      const token = 'test-token-xyz123';
      const shareId = 'share-id-456';
      const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();

      const proof = createShareSessionProof(token, shareId, futureExpiry);
      expect(typeof proof).toBe('string');
      expect(verifyShareSessionProof(token, proof)).toBe(true);
    });

    it('rejects proofs when token does not match', () => {
      const token = 'token-a';
      const shareId = 'share-1';
      const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();

      const proof = createShareSessionProof(token, shareId, futureExpiry);
      expect(verifyShareSessionProof('token-b', proof)).toBe(false);
    });

    it('rejects expired session proofs', () => {
      const token = 'token-expired';
      const shareId = 'share-2';
      const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString();

      const proof = createShareSessionProof(token, shareId, pastExpiry);
      expect(verifyShareSessionProof(token, proof)).toBe(false);
    });

    it('rejects forged or tampered proof strings', () => {
      expect(verifyShareSessionProof('token', 'invalid-proof-string')).toBe(false);
      expect(verifyShareSessionProof('token', undefined)).toBe(false);
    });
  });

  describe('Database Case Share Lifecycle', () => {
    let testStudyId: string;
    let testAccession: string;

    beforeEach(async () => {
      testStudyId = crypto.randomUUID();
      testAccession = `ACC_SHARE_TEST_${Date.now()}`;
      const patientId = crypto.randomUUID();
      const now = new Date().toISOString();

      if (IS_SQLITE && sqlite) {
        sqlite
          .prepare(
            `INSERT INTO patients (id, mr_number, full_name, dob, age, gender, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(patientId, `MRN_${testAccession}`, 'Test Share Patient', '1990-01-01', 35, 'Male', now);

        sqlite
          .prepare(
            `INSERT INTO studies (id, patient_id, accession_number, modality, scan_type, body_part, scheduled_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(testStudyId, patientId, testAccession, 'MRI', 'Brain MRI', 'Head', now, now);
      } else {
        await db.insert(patients).values({
          id: patientId,
          mrNumber: `MRN_${testAccession}`,
          fullName: 'Test Share Patient',
          dob: '1990-01-01',
          age: 35,
          gender: 'Male',
          createdAt: now,
        } as any);

        await db.insert(studies).values({
          id: testStudyId,
          patientId,
          accessionNumber: testAccession,
          modality: 'MRI',
          scanType: 'Brain MRI',
          bodyPart: 'Head',
          scheduledAt: now,
          createdAt: now,
        } as any);
      }
    });

    it('creates a case share and verifies public metadata without exposing PHI', async () => {
      const share = await createCaseShare('user-radiologist-1', {
        studyId: testStudyId,
        password: 'RAD-999',
        passwordHint: 'Department PIN',
        durationHours: 24,
      });

      expect(share.token).toBeDefined();
      expect(share.passwordPin).toBe('RAD-999');
      expect(share.shareUrl).toContain(`/share/${share.token}`);

      // Verify public metadata does not leak patient name or MRN
      const meta = await getPublicShareMeta(share.token);
      expect(meta.status).toBe('valid');
      expect(meta.passwordHint).toBe('Department PIN');
      expect((meta as any).patientName).toBeUndefined();
      expect((meta as any).mrNumber).toBeUndefined();
      expect(meta.studyPreview?.modality).toBe('MRI');
    });

    it('verifies consultant share with correct PIN and rejects incorrect PIN', async () => {
      const share = await createCaseShare('user-radiologist-1', {
        studyId: testStudyId,
        password: 'RAD-777',
        durationHours: 48,
      });

      // Wrong PIN
      const failRes = await verifyConsultantShare(share.token, 'WRONG-PIN');
      expect(failRes.success).toBe(false);
      expect(failRes.error).toContain('Invalid PIN');

      // Correct PIN
      const successRes = await verifyConsultantShare(share.token, 'RAD-777');
      expect(successRes.success).toBe(true);
      expect(successRes.sessionProof).toBeDefined();
      expect(verifyShareSessionProof(share.token, successRes.sessionProof)).toBe(true);
    });

    it('supports listing and revoking active shares', async () => {
      const share = await createCaseShare('user-radiologist-1', {
        studyId: testStudyId,
        password: 'RAD-123',
        durationHours: 72,
      });

      const list = await listSharesForStudy(testStudyId);
      expect(list.length).toBeGreaterThanOrEqual(1);

      // Revoke
      await revokeCaseShare(share.id, 'user-radiologist-1');

      // Now public meta should report expired_or_invalid
      const revokedMeta = await getPublicShareMeta(share.token);
      expect(revokedMeta.status).toBe('expired_or_invalid');
      expect(revokedMeta.reason).toBe('revoked');
    });
  });
});
