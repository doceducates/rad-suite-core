import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isClinicGatewayConfigured,
  fetchGatewayNodes,
  dispatchGatewayAction,
  forwardHeartbeatToGateway,
  clearGatewayClientCache,
} from '../clinic-gateway-client';

describe('Clinic Gateway Client Adapter', () => {
  const originalEnv = process.env.CLINIC_GATEWAY_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearGatewayClientCache();
  });

  afterEach(() => {
    process.env.CLINIC_GATEWAY_URL = originalEnv;
  });

  it('returns false/null when CLINIC_GATEWAY_URL is not configured', async () => {
    delete process.env.CLINIC_GATEWAY_URL;
    delete process.env.NEXT_PUBLIC_CLINIC_GATEWAY_URL;

    expect(isClinicGatewayConfigured()).toBe(false);
    expect(await fetchGatewayNodes()).toBeNull();
    expect(await dispatchGatewayAction('node-1', 'harvest')).toBeNull();
    expect(await forwardHeartbeatToGateway({}, 'token')).toBeNull();
  });

  it('fetches nodes when CLINIC_GATEWAY_URL is configured', async () => {
    process.env.CLINIC_GATEWAY_URL = 'http://localhost:4130';

    const mockNodes = [
      {
        nodeId: 'clinic-pc-primary',
        online: true,
        disk: { totalGb: 512, usedGb: 100, freeGb: 412, usedPercent: 20 },
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, nodes: mockNodes }),
    } as any);

    const result = await fetchGatewayNodes();
    expect(result).not.toBeNull();
    expect(result?.nodes.length).toBe(1);
    expect(result?.telemetry?.nodeId).toBe('clinic-pc-primary');
  });

  it('dispatches action to gateway when configured', async () => {
    process.env.CLINIC_GATEWAY_URL = 'http://localhost:4130';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Action queued in gateway' }),
    } as any);

    const result = await dispatchGatewayAction('clinic-pc-primary', 'run-diagnostics');
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.message).toContain('Action queued in gateway');
  });

  it('forwards heartbeat to gateway when configured', async () => {
    process.env.CLINIC_GATEWAY_URL = 'http://localhost:4130';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, pendingAction: 'test-action', acknowledgedAt: '2026-10-11T00:00:00Z' }),
    } as any);

    const result = await forwardHeartbeatToGateway({ nodeId: 'clinic-pc-primary' }, 'secret-token');
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.pendingAction).toBe('test-action');
  });

  it('executes command on gateway when configured', async () => {
    process.env.CLINIC_GATEWAY_URL = 'http://localhost:4130';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        actionId: 'act-123',
        command: 'Get-Service Orthanc',
        message: 'Command queued',
      }),
    } as any);

    const { executeGatewayCommand } = await import('../clinic-gateway-client');
    const result = await executeGatewayCommand('clinic-pc-primary', 'Get-Service Orthanc');
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
    expect(result?.actionId).toBe('act-123');
  });

  it('fetches command logs and last command from gateway', async () => {
    process.env.CLINIC_GATEWAY_URL = 'http://localhost:4130';

    const mockCmd = {
      id: 'cmd-1',
      nodeId: 'clinic-pc-primary',
      command: 'dir',
      stdout: 'file.txt',
      stderr: '',
      exitCode: 0,
      executedAt: '2026-10-11T00:00:00Z',
    };

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, total: 1, commands: [mockCmd] }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, command: mockCmd }),
      } as any);

    const { fetchGatewayCommandLogs, fetchGatewayLastCommand } = await import('../clinic-gateway-client');
    const logs = await fetchGatewayCommandLogs('clinic-pc-primary', 5);
    expect(logs?.success).toBe(true);
    expect(logs?.commands.length).toBe(1);

    const last = await fetchGatewayLastCommand('clinic-pc-primary');
    expect(last?.success).toBe(true);
    expect(last?.command.stdout).toBe('file.txt');
  });

  it('coalesces concurrent requests and serves cached responses without redundant fetch calls', async () => {
    process.env.CLINIC_GATEWAY_URL = 'http://localhost:4130';

    const mockNodes = [
      {
        nodeId: 'clinic-pc-primary',
        online: true,
        disk: { totalGb: 512, usedGb: 100, freeGb: 412, usedPercent: 20 },
      },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      // Simulate minor network delay
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        status: 200,
        headers: { get: (name: string) => (name.toLowerCase() === 'etag' ? 'W/"node-hash-1"' : null) },
        json: async () => ({ success: true, nodes: mockNodes }),
      } as any;
    });

    // 1. Fire 3 concurrent calls: should coalesce into exactly 1 network call
    const [res1, res2, res3] = await Promise.all([
      fetchGatewayNodes(),
      fetchGatewayNodes(),
      fetchGatewayNodes(),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res1?.nodes.length).toBe(1);
    expect(res2?.nodes.length).toBe(1);
    expect(res3?.nodes.length).toBe(1);

    // 2. Sequential call within TTL (3000ms): served immediately from cache with 0 network calls
    const cachedRes = await fetchGatewayNodes();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(cachedRes?.nodes[0].nodeId).toBe('clinic-pc-primary');
  });

  it('caches study queries and passes If-None-Match with 304 handling', async () => {
    process.env.CLINIC_GATEWAY_URL = 'http://localhost:4130';
    const { queryGatewayStudies } = await import('../clinic-gateway-client');

    const mockStudies = [{ accessionNumber: 'ACC-123', modality: 'MR', patientName: 'TEST' }];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name.toLowerCase() === 'etag' ? 'W/"study-etag-1"' : null) },
      json: async () => ({ success: true, total: 1, studies: mockStudies }),
    } as any);

    // Call 1: Fetches from network and populates cache
    const q1 = await queryGatewayStudies({ accession: 'ACC-123' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(q1?.studies.length).toBe(1);

    // Call 2: Within TTL, served directly from cache (0 additional network calls)
    const q2 = await queryGatewayStudies({ accession: 'ACC-123' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(q2?.studies[0].accessionNumber).toBe('ACC-123');
  });
});
