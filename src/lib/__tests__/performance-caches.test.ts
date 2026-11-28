import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serverTtlCache } from '../server-ttl-cache';
import { clientViewCache } from '../client-view-cache';
import { syncBroadcaster } from '@/services/sync/sync-stream-broadcaster';

describe('serverTtlCache & clientViewCache', () => {
  beforeEach(() => {
    serverTtlCache.clear();
    clientViewCache.clear();
    vi.useRealTimers();
  });

  it('coalesces concurrent getOrSet calls into a single loader execution', async () => {
    let resolveLoader!: (val: { count: number }) => void;
    const loader = vi.fn(
      () =>
        new Promise<{ count: number }>((resolve) => {
          resolveLoader = resolve;
        })
    );

    const p1 = serverTtlCache.getOrSet('dashboard:u1:0:0', 10_000, loader);
    const p2 = serverTtlCache.getOrSet('dashboard:u1:0:0', 10_000, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    resolveLoader({ count: 42 });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ count: 42 });
    expect(r2).toEqual({ count: 42 });

    const r3 = await serverTtlCache.getOrSet('dashboard:u1:0:0', 10_000, loader);
    expect(r3).toEqual({ count: 42 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('expires TTL entries and supports prefix invalidation', () => {
    vi.useFakeTimers();
    serverTtlCache.set('dashboard:a', 1, 5000);
    serverTtlCache.set('dashboard:b', 2, 5000);
    serverTtlCache.set('release:latest', '1.0.0', 60_000);

    expect(serverTtlCache.get('dashboard:a')).toBe(1);
    vi.advanceTimersByTime(5001);
    expect(serverTtlCache.get('dashboard:a')).toBeUndefined();
    expect(serverTtlCache.get('release:latest')).toBe('1.0.0');

    serverTtlCache.set('dashboard:c', 3, 5000);
    serverTtlCache.invalidatePrefix('dashboard:');
    expect(serverTtlCache.get('dashboard:c')).toBeUndefined();
    expect(serverTtlCache.get('release:latest')).toBe('1.0.0');
  });

  it('invalidates server dashboard and telemetry caches on syncBroadcaster mutations', () => {
    serverTtlCache.set('dashboard:u1:1:0', { ok: true }, 10_000);
    serverTtlCache.set('telemetry:summary', { total: 5 }, 30_000);

    syncBroadcaster.broadcast({
      tableName: 'reports',
      entityId: 'rep_1',
      operation: 'UPDATE',
      changedAt: new Date().toISOString(),
    });

    expect(serverTtlCache.get('dashboard:u1:1:0')).toBeUndefined();
    expect(serverTtlCache.get('telemetry:summary')).toEqual({ total: 5 });

    syncBroadcaster.broadcast({
      tableName: 'users',
      entityId: 'usr_1',
      operation: 'UPDATE',
      changedAt: new Date().toISOString(),
    });
    expect(serverTtlCache.get('telemetry:summary')).toBeUndefined();
  });

  it('stores, expires, and invalidates clientViewCache entries', () => {
    vi.useFakeTimers();
    clientViewCache.set('dashboard:summary', { kpis: 10 }, 10_000);
    expect(clientViewCache.get('dashboard:summary')).toEqual({ kpis: 10 });

    vi.advanceTimersByTime(10_001);
    expect(clientViewCache.get('dashboard:summary')).toBeNull();

    clientViewCache.set('worklist:default', [1, 2], 30_000);
    clientViewCache.invalidatePrefix('worklist:');
    expect(clientViewCache.get('worklist:default')).toBeNull();
  });
});
