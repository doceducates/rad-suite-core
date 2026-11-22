import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchRelayedClinicStatus,
  dispatchRelayedClinicAction,
  resetRelayCache,
  testRelayConnection,
  getEffectiveRelayConfig,
} from '../clinic-relay.service';
import {
  saveStoredRelayConfig,
  clearStoredRelayConfig,
} from '../clinic-relay-storage.service';
import {
  getClinicNodeStatusWithRelay,
  dispatchClinicAction,
  recordClinicHeartbeat,
} from '../clinic-node.service';

describe('Cloud-to-Localhost Clinic Node Relay Bridge', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetRelayCache();
    process.env.ENABLE_CLINIC_RELAY_IN_TEST = 'true';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3780';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('fetches relayed telemetry via token-authenticated heartbeat GET and annotates relayedFrom', async () => {
    const mockTelemetry = {
      nodeId: 'clinic-pc-primary',
      online: true,
      orthancStatus: 'running',
      disk: { totalGb: 390.9, usedGb: 102.2, freeGb: 288.7, usedPercent: 26 },
      casesToday: 2,
      targetCases: 50,
      instancesToday: 140,
      syncedStudies: [],
      activeUpload: null,
      uploadQueue: [],
      lastHeartbeat: new Date().toISOString(),
      pendingAction: null,
      pacsStatus: { connected: true, latencyMs: 7, targetHost: '10.0.0.100', targetPort: 8040 },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        telemetry: mockTelemetry,
        nodes: [mockTelemetry],
      }),
    } as any);

    const res = await fetchRelayedClinicStatus('clinic-pc-primary');
    expect(res).not.toBeNull();
    expect(res?.telemetry?.online).toBe(true);
    expect(res?.telemetry?.relayedFrom).toBe('https://radiology.sehatai.org');
    expect(res?.telemetry?.pacsStatus?.connected).toBe(true);
    expect(res?.nodes[0]?.relayedFrom).toBe('https://radiology.sehatai.org');
  });

  it('falls back to session-authenticated /api/clinic-node when heartbeat GET is not yet deployed (405)', async () => {
    const mockTelemetry = {
      nodeId: 'clinic-pc-primary',
      online: true,
      orthancStatus: 'running',
      disk: { totalGb: 390, usedGb: 100, freeGb: 290, usedPercent: 25 },
      casesToday: 1,
      targetCases: 50,
      instancesToday: 45,
      syncedStudies: [],
      activeUpload: null,
      uploadQueue: [],
      lastHeartbeat: new Date().toISOString(),
      pendingAction: null,
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 405,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          telemetry: mockTelemetry,
          nodes: [mockTelemetry],
        }),
      } as any);

    const res = await fetchRelayedClinicStatus('clinic-pc-primary');
    expect(res).not.toBeNull();
    expect(res?.telemetry?.online).toBe(true);
    expect(res?.telemetry?.relayedFrom).toBe('https://radiology.sehatai.org');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('prevents infinite self-loop when NEXT_PUBLIC_APP_URL matches clinicRelayUrl', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://radiology.sehatai.org';
    global.fetch = vi.fn();

    const res = await fetchRelayedClinicStatus('clinic-pc-primary');
    expect(res).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('dispatches remote actions through the relay when local node is offline', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "Action 'ping-pacs' queued for execution on clinic node clinic-pc-primary.",
      }),
    } as any);

    const result = await dispatchClinicAction(
      'ping-pacs',
      { id: 'dev-1', name: 'Dr. Dev' },
      undefined,
      'remote-only-node'
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('ping-pacs');
  });

  it('uses local telemetry directly without relay when local node is online', async () => {
    recordClinicHeartbeat({
      nodeId: 'local-direct-node',
      orthancStatus: 'running',
      casesToday: 5,
    });
    global.fetch = vi.fn();

    const status = await getClinicNodeStatusWithRelay('local-direct-node');
    expect(status.telemetry.online).toBe(true);
    expect(status.telemetry.relayedFrom).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('supports runtime custom relay configuration overrides and persistence', () => {
    clearStoredRelayConfig();
    const initial = getEffectiveRelayConfig();
    expect(initial.source).toBe('env');

    saveStoredRelayConfig({
      relayUrl: 'https://custom-clinic.vps.local',
      secret: 'custom-secret-key-123',
    });

    const updated = getEffectiveRelayConfig();
    expect(updated.source).toBe('custom');
    expect(updated.relayUrl).toBe('https://custom-clinic.vps.local');
    expect(updated.secret).toBe('custom-secret-key-123');

    clearStoredRelayConfig();
    const reverted = getEffectiveRelayConfig();
    expect(reverted.source).toBe('env');
  });

  it('tests relay connection and returns latency and node count', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        nodes: [{ nodeId: 'node-desktop-1' }, { nodeId: 'node-desktop-2' }],
      }),
    } as any);

    const result = await testRelayConnection('https://radiology.sehatai.org', 'test-token');
    expect(result.success).toBe(true);
    expect(result.nodeCount).toBe(2);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.message).toContain('2 nodes');
  });

  it('handles authentication failure during connection test gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as any);

    const result = await testRelayConnection('https://radiology.sehatai.org', 'bad-token');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Authentication failed');
  });
});
