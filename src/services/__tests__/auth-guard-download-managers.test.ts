import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth-guard';
import { createSession, getCurrentUser } from '@/services/auth.service';

describe('Auth Guard Download Manager & External Tool Authentication', () => {
  let adminUser: any;
  let sessionToken: string;

  beforeAll(async () => {
    adminUser = await getCurrentUser();
    expect(adminUser).toBeDefined();
    sessionToken = await createSession(adminUser.id);
  });

  it('authenticates successfully via HTTP Basic Auth (IDM dialog flow)', async () => {
    // IDM sends "Basic base64(username:password)"
    const credentials = Buffer.from(`${adminUser.email}:${process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345!'}`).toString('base64');
    const req = new NextRequest('http://localhost:3780/api/pacs/download?accession=123', {
      headers: {
        authorization: `Basic ${credentials}`,
      },
    });

    const result = await authenticateRequest(req);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.id).toBe(adminUser.id);
      expect(result.user.email).toBe(adminUser.email);
    }
  });

  it('authenticates successfully via URL Query Token (?token=...)', async () => {
    const req = new NextRequest(`http://localhost:3780/api/pacs/download?accession=123&token=${sessionToken}`);
    const result = await authenticateRequest(req);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.id).toBe(adminUser.id);
    }
  });

  it('authenticates successfully via URL Query Token (?auth=...)', async () => {
    const req = new NextRequest(`http://localhost:3780/api/pacs/download?accession=123&auth=${sessionToken}`);
    const result = await authenticateRequest(req);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.id).toBe(adminUser.id);
    }
  });

  it('authenticates successfully via request cookie rad_suite_session', async () => {
    const req = new NextRequest('http://localhost:3780/api/pacs/download?accession=123', {
      headers: {
        cookie: `rad_suite_session=${sessionToken}`,
      },
    });
    const result = await authenticateRequest(req);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.id).toBe(adminUser.id);
    }
  });

  it('authenticates successfully via request cookie rad_session fallback', async () => {
    const req = new NextRequest('http://localhost:3780/api/pacs/download?accession=123', {
      headers: {
        cookie: `rad_session=${sessionToken}`,
      },
    });
    const result = await authenticateRequest(req);
    expect('user' in result).toBe(true);
    if ('user' in result) {
      expect(result.user.id).toBe(adminUser.id);
    }
  });
});
