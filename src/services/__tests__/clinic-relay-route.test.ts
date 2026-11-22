import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as authGuard from '@/lib/auth-guard';
import { GET, POST } from '@/app/api/clinic-node/relay-config/route';
import { clearStoredRelayConfig } from '@/services/clinic-relay-storage.service';

describe('Clinic Relay Configuration API Route (RBAC & Persistence)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearStoredRelayConfig();
  });

  it('rejects non-admin roles with 403 Forbidden', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValueOnce({
      user: {
        id: 'user-rad-1',
        email: 'rad@hospital.org',
        name: 'Dr. Radiologist',
        title: 'Consultant Radiologist',
        role: 'radiologist',
        createdAt: new Date(),
      },
    });

    const req = new NextRequest('http://localhost:3780/api/clinic-node/relay-config');
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Role 'radiologist' is not authorized");
  });

  it('allows admin to GET effective relay configuration without exposing secret', async () => {
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

    const req = new NextRequest('http://localhost:3780/api/clinic-node/relay-config');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.relayUrl).toBeDefined();
    expect(body.secret).toBeUndefined(); // Secret must NEVER be returned in plaintext
    expect(typeof body.hasSecret).toBe('boolean');
  });

  it('allows admin to POST save new custom relay settings', async () => {
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

    // Mock fetch for the test ping
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, nodes: [{ nodeId: 'test-node' }] }),
    } as any);

    const req = new NextRequest('http://localhost:3780/api/clinic-node/relay-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        relayUrl: 'https://new-relay.sehatai.org',
        secret: 'test-secret-token',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.relayUrl).toBe('https://new-relay.sehatai.org');
    expect(body.source).toBe('custom');
    expect(body.hasSecret).toBe(true);
  });

  it('allows admin to POST reset to clear custom settings', async () => {
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

    const req = new NextRequest('http://localhost:3780/api/clinic-node/relay-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('cleared');
  });
});
