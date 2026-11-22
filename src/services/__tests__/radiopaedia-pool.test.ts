import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { fetchRadiopaediaCases } from '../radiopaedia-api.service';

describe('Radiopaedia Multi-Account Pooling & Crypto', () => {
  it('should encrypt and decrypt secrets with AES-256-GCM', () => {
    const rawSecret = '01a1649a0ca40b2114ec3ab3c849b249347d916b73cb52536c5f8329cda61251';
    const encrypted = encryptSecret(rawSecret);

    expect(encrypted).toMatch(/^enc:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(encrypted).not.toContain(rawSecret);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('should gracefully fallback to curated cases if no live account is connected', async () => {
    const result = await fetchRadiopaediaCases('infarct', 'CT', 'Brain');
    expect(result.cases.length).toBeGreaterThan(0);
    expect(result.source).toBe('curated_offline');
    expect(result.cases.some((c) => c.title.toLowerCase().includes('infarct'))).toBe(true);
  });

  it('should filter fallback cases by modality and anatomy seamlessly', async () => {
    const mriResult = await fetchRadiopaediaCases('', 'MRI', 'Spine');
    expect(mriResult.cases.length).toBeGreaterThan(0);
    expect(mriResult.cases.every((c) => c.modality === 'MRI')).toBe(true);
  });
});
