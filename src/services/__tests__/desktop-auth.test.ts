import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initDesktopAuthRequest,
  completeDesktopAuthRequest,
  pollDesktopAuthRequest,
} from '../desktop-auth.service';

describe('Desktop App Browser Auth Handoff Service', () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id-123.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret-xyz';
  });

  it('initializes a desktop auth handshake request with a valid URL and ID', () => {
    const { id, authUrl } = initDesktopAuthRequest({
      intent: 'login',
      redirect: '/worklist',
    });

    expect(id).toMatch(/^desk_[a-f0-9]{40}$/);
    expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(authUrl).toContain('client_id=');

    // Decode state and verify desktopAuthId
    const url = new URL(authUrl);
    const stateParam = url.searchParams.get('state');
    expect(stateParam).toBeTruthy();
    const state = JSON.parse(Buffer.from(stateParam!, 'base64url').toString('utf8'));
    expect(state.mode).toBe('desktop');
    expect(state.desktopAuthId).toBe(id);
    expect(state.redirect).toBe('/worklist');
  });

  it('manages polling lifecycle: pending -> completed -> consumed', () => {
    const { id } = initDesktopAuthRequest({ intent: 'login' });

    // 1. Initial status should be pending
    const initialPoll = pollDesktopAuthRequest(id);
    expect(initialPoll.status).toBe('pending');

    // 2. Browser callback completes the handshake
    const mockUser = {
      id: 'mock-user-123',
      name: 'Dr. Desktop Radiologist',
      email: 'desktop@hospital.org',
      role: 'consultant',
      status: 'active',
    };
    const completed = completeDesktopAuthRequest(id, {
      sessionToken: 'rad-desk-token-999',
      user: mockUser,
      targetUrl: '/worklist',
    });
    expect(completed).toBe(true);

    // 3. Next poll should return completed with credentials
    const completedPoll = pollDesktopAuthRequest(id);
    expect(completedPoll.status).toBe('completed');
    expect(completedPoll.sessionToken).toBe('rad-desk-token-999');
    expect(completedPoll.user.name).toBe('Dr. Desktop Radiologist');
    expect(completedPoll.targetUrl).toBe('/worklist');
  });

  it('returns expired for non-existent or invalid desktop request IDs', () => {
    const poll = pollDesktopAuthRequest('non_existent_id');
    expect(poll.status).toBe('expired');
  });
});
