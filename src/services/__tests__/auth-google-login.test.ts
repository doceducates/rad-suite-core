import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGoogleLoginAuthUrl,
  handleGoogleOAuthLogin,
  renderOAuthCallbackHtml,
  renderOAuthErrorHtml,
} from '../google-login.service';
import * as googleAuthService from '../google-auth.service';
import { inviteService } from '../invite.service';
import { authenticateRequest } from '@/lib/auth-guard';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users, sessions, inviteCodes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Google OAuth Login & Clinician Authentication Service', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id-123.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret-xyz';
  });

  describe('getGoogleLoginAuthUrl', () => {
    it('generates a valid Google OAuth authorization URL with select_account and offline access', () => {
      const url = getGoogleLoginAuthUrl({
        intent: 'login',
        mode: 'popup',
        redirect: '/worklist',
      });

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=select_account');
      expect(url).toContain('state=');

      // Decode and verify state
      const urlObj = new URL(url);
      const stateParam = urlObj.searchParams.get('state');
      expect(stateParam).toBeTruthy();
      const state = JSON.parse(Buffer.from(stateParam!, 'base64url').toString('utf8'));
      expect(state.intent).toBe('login');
      expect(state.mode).toBe('popup');
      expect(state.redirect).toBe('/worklist');
    });

    it('embeds inviteCode into state when provided for registration', () => {
      const url = getGoogleLoginAuthUrl({
        intent: 'register',
        inviteCode: 'alpha-doc-2026',
      });

      const urlObj = new URL(url);
      const stateParam = urlObj.searchParams.get('state');
      const state = JSON.parse(Buffer.from(stateParam!, 'base64url').toString('utf8'));
      expect(state.intent).toBe('register');
      expect(state.inviteCode).toBe('ALPHA-DOC-2026');
    });
  });

  describe('handleGoogleOAuthLogin', () => {
    it('authenticates an existing clinician matching googleEmail and updates tokens', async () => {
      const testUserId = crypto.randomUUID();
      const testEmail = `doctor-${crypto.randomBytes(4).toString('hex')}@radsuite.pk`;
      const testGoogleEmail = `dr.${crypto.randomBytes(4).toString('hex')}@gmail.com`;

      await db.insert(users).values({
        id: testUserId,
        name: 'Dr. Existing Radiologist',
        email: testEmail,
        googleEmail: testGoogleEmail,
        passwordHash: 'dummyhash',
        role: 'radiologist',
        status: 'active',
        createdAt: new Date(),
      } as any);

      // Mock exchangeGoogleAuthCode
      vi.spyOn(googleAuthService, 'exchangeGoogleAuthCode').mockResolvedValueOnce({
        accessToken: 'ya29.new-access-token',
        refreshToken: '1//new-refresh-token',
        expiresIn: 3600,
        email: testGoogleEmail,
        name: 'Dr. Existing Radiologist',
      });

      const result = await handleGoogleOAuthLogin({
        code: 'mock-auth-code',
      });

      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe(testUserId);
      expect(result.targetUrl).toBe('/worklist');
      expect(result.sessionToken).toBeDefined();

      // Verify tokens were updated in DB
      const [u] = await db.select().from(users).where(eq(users.id, testUserId as any)).limit(1);
      expect((u as any).googleAccessToken).toBe('ya29.new-access-token');
      expect((u as any).googleRefreshToken).toMatch(/^enc:/);

      // Verify session exists in DB
      const [sess] = await db.select().from(sessions).where(eq(sessions.token, result.sessionToken)).limit(1);
      expect(sess).toBeDefined();
      expect(sess.userId).toBe(testUserId);
    });

    it('matches an existing user by standard email and auto-links their Google account', async () => {
      const testUserId = crypto.randomUUID();
      const commonEmail = `dr.common.${crypto.randomBytes(4).toString('hex')}@hospital.org`;

      await db.insert(users).values({
        id: testUserId,
        name: 'Dr. Common Email',
        email: commonEmail,
        passwordHash: 'dummyhash',
        role: 'consultant',
        status: 'active',
        createdAt: new Date(),
      } as any);

      vi.spyOn(googleAuthService, 'exchangeGoogleAuthCode').mockResolvedValueOnce({
        accessToken: 'ya29.common-token',
        refreshToken: '1//common-refresh',
        expiresIn: 3600,
        email: commonEmail,
        name: 'Dr. Common Email',
      });

      const result = await handleGoogleOAuthLogin({
        code: 'mock-code-2',
      });

      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe(testUserId);

      const [u] = await db.select().from(users).where(eq(users.id, testUserId as any)).limit(1);
      expect((u as any).googleEmail).toBe(commonEmail);
      expect((u as any).googleAccessToken).toBe('ya29.common-token');
    });

    it('registers a new clinician with a valid invite code as active', async () => {
      const newGoogleEmail = `newdoc.${crypto.randomBytes(4).toString('hex')}@gmail.com`;
      const inviteCode = `INV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      vi.spyOn(inviteService, 'validateInviteCode').mockResolvedValueOnce({
        valid: true,
        invite: {
          id: 'mock-invite-id',
          code: inviteCode,
          role: 'consultant',
          allowedScreens: JSON.stringify(['my_cases', 'worklist', 'workstation']),
          usesCount: '0',
          maxUses: '5',
          isActive: true,
        } as any,
      });

      vi.spyOn(googleAuthService, 'exchangeGoogleAuthCode').mockResolvedValueOnce({
        accessToken: 'ya29.new-token',
        refreshToken: '1//new-refresh',
        expiresIn: 3600,
        email: newGoogleEmail,
        name: 'Dr. New Clinician',
      });

      const state = Buffer.from(
        JSON.stringify({ intent: 'register', inviteCode, redirect: '/worklist' })
      ).toString('base64url');

      const result = await handleGoogleOAuthLogin({
        code: 'mock-new-code',
        state,
      });

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe(newGoogleEmail);
      expect(result.user.role).toBe('consultant');
      expect(result.user.status).toBe('active');
      expect(result.targetUrl).toBe('/worklist');

      // Verify in DB
      const [u] = await db.select().from(users).where(eq(users.id, result.user.id as any)).limit(1);
      expect(u).toBeDefined();
      expect((u as any).googleEmail).toBe(newGoogleEmail);
      expect((u as any).status).toBe('active');
      expect((u as any).inviteCodeUsed).toBe(inviteCode);
    });

    it('registers a new clinician without invite code as waitlisted and redirects to pending-access', async () => {
      const waitlistEmail = `waitlist.${crypto.randomBytes(4).toString('hex')}@gmail.com`;

      vi.spyOn(googleAuthService, 'exchangeGoogleAuthCode').mockResolvedValueOnce({
        accessToken: 'ya29.waitlist-token',
        expiresIn: 3600,
        email: waitlistEmail,
        name: 'Dr. Waitlisted Radiologist',
      });

      const state = Buffer.from(JSON.stringify({ intent: 'register', mode: 'web' })).toString('base64url');

      const result = await handleGoogleOAuthLogin({
        code: 'mock-waitlist-code',
        state,
      });

      expect(result.isNewUser).toBe(true);
      expect(result.user.status).toBe('waitlisted');
      expect(result.targetUrl).toBe('/pending-access');

      const [u] = await db.select().from(users).where(eq(users.id, result.user.id as any)).limit(1);
      expect(u).toBeDefined();
      expect((u as any).status).toBe('waitlisted');
    });

    it('allows desktop and mobile clients to authenticate using Bearer session token', async () => {
      const desktopDocEmail = `desktop.${crypto.randomBytes(4).toString('hex')}@gmail.com`;

      vi.spyOn(googleAuthService, 'exchangeGoogleAuthCode').mockResolvedValueOnce({
        accessToken: 'ya29.desktop-token',
        expiresIn: 3600,
        email: desktopDocEmail,
        name: 'Dr. Desktop User',
      });

      const result = await handleGoogleOAuthLogin({
        code: 'mock-desktop-code',
      });

      expect(result.sessionToken).toBeTruthy();

      // Simulate Desktop API Request with Bearer header
      const dummyReq = new NextRequest('http://localhost:3780/api/auth/me', {
        headers: {
          authorization: `Bearer ${result.sessionToken}`,
        },
      });

      const authRes = await authenticateRequest(dummyReq);
      expect('user' in authRes).toBe(true);
      if ('user' in authRes) {
        expect(authRes.user.id).toBe(result.user.id);
        expect(authRes.user.email).toBe(desktopDocEmail);
      }
    });
  });

  describe('Desktop & Popup Handshake HTML Templates', () => {
    it('renders postMessage and radsuite:// deep link for desktop mode', () => {
      const html = renderOAuthCallbackHtml({
        status: 'active',
        targetUrl: '/worklist',
        sessionToken: 'test-desktop-token-123',
        isDesktop: true,
      });

      expect(html).toContain('RAD_SUITE_GOOGLE_AUTH_SUCCESS');
      expect(html).toContain('radsuite://auth/callback?token=test-desktop-token-123');
      expect(html).toContain('Open Rad Suite Desktop');
      expect(html).toContain('window.opener.postMessage');
    });

    it('renders error message in popup error template', () => {
      const html = renderOAuthErrorHtml('Access denied by user');
      expect(html).toContain('Access denied by user');
      expect(html).toContain('RAD_SUITE_GOOGLE_AUTH_ERROR');
      expect(html).toContain('Close Window');
    });
  });
});
