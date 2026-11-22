import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ALLOWED_PACS_PORTS } from '@/services/pacs-network.service';
import * as authGuard from '@/lib/auth-guard';
import * as clinicNodeService from '@/services/clinic-node.service';
import { POST } from '@/app/api/pacs/ping/route';

describe('PACS Ping & Reachability Probe API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('includes port 11115 in ALLOWED_PACS_PORTS for Clinic PACS Archive', () => {
    expect(ALLOWED_PACS_PORTS.has(11115)).toBe(true);
    expect(ALLOWED_PACS_PORTS.has(8040)).toBe(true);
    expect(ALLOWED_PACS_PORTS.has(4242)).toBe(true);
  });

  it('routes Clinic Edge Node ping through relay heartbeat when online', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValueOnce({
      user: {
        id: 'admin-1',
        email: 'admin@hospital.org',
        name: 'Admin',
        title: 'System Administrator',
        role: 'admin',
        createdAt: new Date(),
      },
    });

    vi.spyOn(clinicNodeService, 'getClinicNodeStatusWithRelay').mockResolvedValueOnce({
      telemetry: {
        nodeId: 'node-desktop-1ldu8l1',
        online: true,
        relayedFrom: 'https://radiology.sehatai.org',
      } as any,
      nodes: [],
    });

    const req = new NextRequest('http://localhost:3780/api/pacs/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: '127.0.0.1',
        port: 11115,
        serverId: 'pacs-clinic-edge',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.reachable).toBe(true);
    expect(body.online).toBe(true); // Verifies both keys exist for UI compatibility
    expect(body.message).toContain('Clinic Edge Node is Online');
    expect(body.relayedFrom).toBe('https://radiology.sehatai.org');
  });

  it('reports graceful offline status when Clinic Edge Node is in standby', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValueOnce({
      user: {
        id: 'admin-1',
        email: 'admin@hospital.org',
        name: 'Admin',
        title: 'System Administrator',
        role: 'admin',
        createdAt: new Date(),
      },
    });

    vi.spyOn(clinicNodeService, 'getClinicNodeStatusWithRelay').mockResolvedValueOnce({
      telemetry: {
        nodeId: 'node-desktop-1ldu8l1',
        online: false,
      } as any,
      nodes: [],
    });

    const req = new NextRequest('http://localhost:3780/api/pacs/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: '127.0.0.1',
        port: 11115,
        serverId: 'pacs-clinic-edge',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.reachable).toBe(false);
    expect(body.online).toBe(false);
    expect(body.error).toContain('Clinic PC is currently offline');
  });
});
