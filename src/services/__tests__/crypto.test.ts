import { describe, test, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '@/lib/crypto';

describe('AES-256-GCM Crypto Helper', () => {
  test('encrypts and decrypts string successfully', () => {
    const raw = 'sk-ant-api03-test-token-1234567890';
    const encrypted = encryptSecret(raw);

    expect(encrypted.startsWith('enc:')).toBe(true);
    expect(encrypted).not.toEqual(raw);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toEqual(raw);
  });

  test('handles empty or unencrypted legacy inputs gracefully', () => {
    expect(encryptSecret('')).toEqual('');
    expect(decryptSecret('')).toEqual('');
    expect(decryptSecret('plaintext-api-key')).toEqual('plaintext-api-key');
  });

  test('fails gracefully on tampered ciphertext', () => {
    const raw = 'secret-key';
    const encrypted = encryptSecret(raw);
    const tampered = encrypted.slice(0, -4) + 'abcd';
    expect(decryptSecret(tampered)).toEqual('');
  });
});
