// Layer 2 Test: Solution B Desktop Cloud-Routed Authentication & Master Admin Governance
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { initDesktopAuthRequest, completeDesktopAuthRequest, pollDesktopAuthRequest } from '../desktop-auth.service';

describe('Solution B: Desktop Cloud-Routed Authentication', () => {
  beforeEach(async () => {
    process.env.GOOGLE_CLIENT_ID = 'mock-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'mock-google-client-secret';
    await db.delete(sessions);
    await db.delete(users);
  });

  it('generates a valid desktop auth request with cloud redirect url', () => {
    const { id, authUrl } = initDesktopAuthRequest({
      intent: 'login',
      customAppUrl: 'https://radiology.sehatai.org',
    });

    expect(id).toMatch(/^desk_/);
    expect(authUrl).toContain('accounts.google.com');
    expect(authUrl).toContain(encodeURIComponent('https://radiology.sehatai.org/api/google/auth/callback'));
  });

  it('completes and polls desktop authentication handshake with user payload', () => {
    const { id } = initDesktopAuthRequest({ intent: 'login' });

    // Initial state is pending
    const initialPoll = pollDesktopAuthRequest(id);
    expect(initialPoll.status).toBe('pending');

    // Complete the handshake (as would happen via callback on cloud)
    const completed = completeDesktopAuthRequest(id, {
      sessionToken: 'test_session_token_123',
      user: {
        id: 'user_test_uuid',
        name: 'Dr. Muhammad Mudassir',
        email: 'mudassir@radsuite.pk',
        role: 'admin',
        status: 'active',
      },
      targetUrl: '/worklist',
    });
    expect(completed).toBe(true);

    // Subsequent poll retrieves completed session
    const polled = pollDesktopAuthRequest(id);
    expect(polled.status).toBe('completed');
    expect(polled.sessionToken).toBe('test_session_token_123');
    expect(polled.user?.email).toBe('mudassir@radsuite.pk');
    expect(polled.user?.role).toBe('admin');
  });

  it('expires non-existent desktop handshakes gracefully', () => {
    const nonExistent = pollDesktopAuthRequest('desk_non_existent');
    expect(nonExistent.status).toBe('expired');
  });
});
