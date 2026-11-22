import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import * as authGuard from '@/lib/auth-guard';

describe('Universal withAuth API Route Security Wrapper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject unauthenticated calls with 401 Unauthorized', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValueOnce({
      errorResponse: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }) as any,
    });

    const handler = withAuth(async () => NextResponse.json({ ok: true }));
    const req = new NextRequest('http://localhost:3000/api/patients/records');
    const res = await handler(req);

    expect(res.status).toBe(401);
  });

  it('should reject unauthorized roles with 403 Forbidden', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValueOnce({
      user: {
        id: 'user-pgr-1',
        email: 'pgr@hospital.org',
        name: 'Dr. Resident',
        role: 'resident',
        title: 'Resident PGR',
        createdAt: new Date(),
      },
    });

    // Requires consultant or admin only
    const handler = withAuth(async () => NextResponse.json({ ok: true }), {
      roles: ['radiologist', 'admin'],
    });

    const req = new NextRequest('http://localhost:3000/api/ai/settings');
    const res = await handler(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Role 'resident' is not authorized");
  });

  it('should shield errors with generic 500 message and requestId without leaking stack traces', async () => {
    vi.spyOn(authGuard, 'authenticateRequest').mockResolvedValueOnce({
      user: {
        id: 'user-admin-1',
        email: 'admin@hospital.org',
        name: 'Admin',
        role: 'admin',
        title: 'Administrator',
        createdAt: new Date(),
      },
    });

    const handler = withAuth(async () => {
      throw new Error('FATAL SQLite syntax error at /var/data/radsuite.db: table corrupted');
    });

    const req = new NextRequest('http://localhost:3000/api/reports/123');
    const res = await handler(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('An internal server error occurred while processing your request.');
    expect(body.requestId).toBeDefined();
    expect(body.error).not.toContain('SQLite');
    expect(body.error).not.toContain('/var/data');
  });
});
