import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGoogleOAuthCredentials,
  getGoogleAuthUrl,
  linkUserGoogleAccount,
  getUserGoogleStatus,
  disconnectGoogleAccount,
  updateUserGoogleSettings,
} from '../google-auth.service';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Google OAuth 2.0 Auth Service', () => {
  let testUserId: string;

  beforeEach(async () => {
    testUserId = crypto.randomUUID();
    // Seed test user
    await db.insert(users).values({
      id: testUserId,
      name: 'Dr. Test Radiologist',
      email: `test-${crypto.randomBytes(4).toString('hex')}@radsuite.pk`,
      passwordHash: 'dummyhash',
      role: 'radiologist',
      createdAt: new Date(),
    } as any);
  });

  it('reads Google OAuth credentials and generates authorization URL with proper scopes', () => {
    const creds = getGoogleOAuthCredentials();
    expect(creds.redirectUri).toContain('/api/google/auth/callback');

    if (creds.configured) {
      const url = getGoogleAuthUrl('test-state-123');
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file');
      expect(url).toContain('state=test-state-123');
      expect(url).toContain('access_type=offline');
    }
  });

  it('normalizes loopback 127.0.0.1 and [::1] to localhost for Google Cloud Console compatibility', () => {
    const creds127 = getGoogleOAuthCredentials('http://127.0.0.1:3780');
    expect(creds127.redirectUri).toBe('http://localhost:3780/api/google/auth/callback');

    const credsIpv6 = getGoogleOAuthCredentials('http://[::1]:3780');
    expect(credsIpv6.redirectUri).toBe('http://localhost:3780/api/google/auth/callback');

    const credsLocalhost = getGoogleOAuthCredentials('http://localhost:3780');
    expect(credsLocalhost.redirectUri).toBe('http://localhost:3780/api/google/auth/callback');

    const credsCloud = getGoogleOAuthCredentials('https://radiology.sehatai.org');
    expect(credsCloud.redirectUri).toBe('https://radiology.sehatai.org/api/google/auth/callback');
  });

  it('securely links Google account, encrypting refresh token', async () => {
    await linkUserGoogleAccount(testUserId, {
      accessToken: 'ya29.fake-access-token',
      refreshToken: '1//fake-refresh-token',
      expiresIn: 3600,
      email: 'doctor@hospital.org',
    });

    const [u] = await db.select().from(users).where(eq(users.id, testUserId as any)).limit(1);
    expect((u as any).googleEmail).toBe('doctor@hospital.org');
    expect((u as any).googleAccessToken).toBe('ya29.fake-access-token');
    // Ensure refresh token is encrypted at rest (AES-256 starts with enc:)
    expect((u as any).googleRefreshToken).toMatch(/^enc:/);

    const status = await getUserGoogleStatus(testUserId);
    expect(status.isConnected).toBe(true);
    expect(status.email).toBe('doctor@hospital.org');
  });

  it('updates Google sync settings and toggles auto-sync', async () => {
    await updateUserGoogleSettings(testUserId, {
      autoSync: true,
      rootFolderId: 'folder-abc-123',
    });

    const status = await getUserGoogleStatus(testUserId);
    expect(status.autoSync).toBe(true);
    expect(status.rootFolderId).toBe('folder-abc-123');
  });

  it('disconnects Google account and clears credentials', async () => {
    await linkUserGoogleAccount(testUserId, {
      accessToken: 'ya29.fake-access-token',
      refreshToken: '1//fake-refresh-token',
      expiresIn: 3600,
      email: 'doctor@hospital.org',
    });

    await disconnectGoogleAccount(testUserId);

    const status = await getUserGoogleStatus(testUserId);
    expect(status.isConnected).toBe(false);
    expect(status.email).toBeUndefined();

    const [u] = await db.select().from(users).where(eq(users.id, testUserId as any)).limit(1);
    expect((u as any).googleRefreshToken).toBeNull();
  });
});
