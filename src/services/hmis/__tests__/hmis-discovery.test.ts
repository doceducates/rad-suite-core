import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getHmisPluginInfo,
  getCandidateGatewayUrls,
  resolveGatewayBaseUrl,
  invalidateGatewayCache,
} from '../hmis-discovery.service';

describe('HMIS Gateway Discovery & Plugin Auto-Detection', () => {
  beforeEach(() => {
    invalidateGatewayCache();
    vi.restoreAllMocks();
  });

  it('1. retrieves plugin info or falls back cleanly', () => {
    const info = getHmisPluginInfo();
    expect(info).toBeDefined();
    expect(typeof info.available).toBe('boolean');
    expect(typeof info.enabled).toBe('boolean');
  });

  it('2. compiles an ordered, unique list of candidate gateway URLs', () => {
    const candidates = getCandidateGatewayUrls();
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates).toContain('http://127.0.0.1:3788');
    // Ensure no duplicates
    const unique = Array.from(new Set(candidates));
    expect(candidates.length).toBe(unique.length);
  });

  it('3. resolves active gateway url dynamically when a candidate responds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('3788')) {
        return new Response(JSON.stringify({ status: 'online', gatewayOnline: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(null, { status: 500 });
    });

    const activeUrl = await resolveGatewayBaseUrl({}, true);
    expect(activeUrl).toContain('3788');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('4. falls back to default url when all candidate probes fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

    const fallbackUrl = await resolveGatewayBaseUrl({}, true);
    expect(fallbackUrl).toBeDefined();
    expect(fallbackUrl).toContain('http');
  });
});
