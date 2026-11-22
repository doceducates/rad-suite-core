import { describe, it, expect, vi } from 'vitest';
import { hashApiKey, resolveMcpRequestContext } from '@/services/mcp-auth.service';

describe('MCP Authentication & Tenant Resolution Service', () => {
  it('computes deterministic SHA-256 hashes of API keys', () => {
    const key = 'rs_live_test1234567890abcdef12345678';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('rejects empty or whitespace-only tokens', async () => {
    const res1 = await resolveMcpRequestContext('');
    const res2 = await resolveMcpRequestContext('   ');
    expect(res1).toBeNull();
    expect(res2).toBeNull();
  });

  it('authenticates master API secret key as full system admin', async () => {
    const mockSecret = 'super_secret_test_key_at_least_32_characters_long';
    process.env.API_SECRET_KEY = mockSecret;

    const ctx = await resolveMcpRequestContext(mockSecret);
    expect(ctx).not.toBeNull();
    expect(ctx?.userRole).toBe('admin');
    expect(ctx?.tenantId).toBe('tnt_lgh');
    expect(ctx?.scopes).toContain('*');
    expect(ctx?.isReadOnly).toBe(false);
  });

  it('rejects invalid or non-existent token when not matching master key or DB', async () => {
    const ctx = await resolveMcpRequestContext('rs_live_non_existent_key_99999');
    expect(ctx).toBeNull();
  });
});
