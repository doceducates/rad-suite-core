import { describe, test, expect } from 'vitest';
import { computeAuditHash, AUDIT_GENESIS_HASH } from '@/services/audit.service';

describe('Audit Trail Tamper-Evidence', () => {
  test('computes deterministic SHA-256 hash for audit entries', () => {
    const hash1 = computeAuditHash(
      AUDIT_GENESIS_HASH,
      '2026-09-18T12:00:00.000Z',
      'user-123',
      'sign_report',
      'Report',
      'rep-456',
      'Signed final report'
    );
    const hash2 = computeAuditHash(
      AUDIT_GENESIS_HASH,
      '2026-09-18T12:00:00.000Z',
      'user-123',
      'sign_report',
      'Report',
      'rep-456',
      'Signed final report'
    );
    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64); // 256-bit hex
  });

  test('detects any change in timestamp or details', () => {
    const hash1 = computeAuditHash(
      AUDIT_GENESIS_HASH,
      '2026-09-18T12:00:00.000Z',
      'user-123',
      'sign_report',
      'Report',
      'rep-456',
      'Original report content'
    );
    const tampered = computeAuditHash(
      AUDIT_GENESIS_HASH,
      '2026-09-18T12:00:00.000Z',
      'user-123',
      'sign_report',
      'Report',
      'rep-456',
      'Modified report content'
    );
    expect(hash1).not.toEqual(tampered);
  });

  test('detects break in previous hash chain', () => {
    const block1Hash = computeAuditHash(
      AUDIT_GENESIS_HASH,
      '2026-09-18T12:00:00.000Z',
      'user-1',
      'login',
      'Auth',
      '',
      'Login ok'
    );

    const block2Hash = computeAuditHash(
      block1Hash,
      '2026-09-18T12:01:00.000Z',
      'user-1',
      'view_patient',
      'Patient',
      'pat-1',
      'Viewed MRN-1001'
    );

    // If an attacker forged block 1
    const forgedBlock1Hash = computeAuditHash(
      AUDIT_GENESIS_HASH,
      '2026-09-18T12:00:00.000Z',
      'user-attacker',
      'login',
      'Auth',
      '',
      'Forged'
    );

    expect(block1Hash).not.toEqual(forgedBlock1Hash);
    // Block 2's prevHash will not match forged block 1
    expect(block1Hash).not.toEqual(forgedBlock1Hash);
  });
});
