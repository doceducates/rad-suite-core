// Layer 2 (Domain/Services): Google OAuth 2.0 Token Management & User Binding
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { logAudit } from './audit.service';
import { config } from '@/lib/config';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

export interface GoogleAuthStatus {
  isConnected: boolean;
  email?: string;
  autoSync: boolean;
  rootFolderId?: string;
}

export function getGoogleOAuthCredentials(customAppUrl?: string) {
  const isAtlas = (customAppUrl?.toLowerCase().includes('atlas') ?? false) || config.isAtlasMode;
  const clientId = (
    isAtlas
      ? (process.env.ATLAS_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)
      : process.env.GOOGLE_CLIENT_ID
  )?.trim() || '';
  const clientSecret = (
    isAtlas
      ? (process.env.ATLAS_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)
      : process.env.GOOGLE_CLIENT_SECRET
  )?.trim() || '';
  let appUrl = (
    customAppUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (isAtlas ? 'https://atlas.doceducates.com' : 'https://radiology.sehatai.org')
  ).replace(/\/$/, '');

  // Normalize loopback IP (127.0.0.1, [::1], 0.0.0.0) to localhost because Google OAuth strictly requires 'localhost'
  try {
    const parsed = new URL(appUrl);
    if (
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '[::1]' ||
      parsed.hostname === '0.0.0.0'
    ) {
      parsed.hostname = 'localhost';
      appUrl = parsed.origin;
    } else if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost') {
      parsed.protocol = 'https:';
      appUrl = parsed.origin;
    }
  } catch {
    appUrl = appUrl.replace(/\/\/(127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?/i, '//localhost$2');
    if (!appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
      appUrl = appUrl.replace(/^http:\/\//i, 'https://');
    }
  }

  const redirectUri = `${appUrl}/api/google/auth/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    appUrl,
    configured: Boolean(clientId && clientSecret),
  };
}

export function getGoogleAuthUrl(state?: string, customAppUrl?: string): string {
  const { clientId, redirectUri, configured } = getGoogleOAuthCredentials(customAppUrl);
  if (!configured) {
    throw new Error('Google OAuth credentials not configured in system environment.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  if (state) {
    params.set('state', state);
  }

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(
  code: string,
  customAppUrl?: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  email?: string;
  name?: string;
  picture?: string;
}> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthCredentials(customAppUrl);
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured.');
  }

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('[GOOGLE_OAUTH_EXCHANGE_FAILED]', res.status, errorBody);
    throw new Error(`Google token exchange failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const expiresIn = data.expires_in || 3600;

  // Retrieve user email, name and avatar from Google UserInfo API
  let email: string | undefined;
  let name: string | undefined;
  let picture: string | undefined;
  try {
    const userRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.email;
      name = userData.name;
      picture = userData.picture;
    }
  } catch (err) {
    console.warn('[GOOGLE_USERINFO_FETCH_WARN]', err);
  }

  return { accessToken, refreshToken, expiresIn, email, name, picture };
}

export async function linkUserGoogleAccount(
  userId: string,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    email?: string;
  }
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  const updates: Record<string, any> = {
    googleAccessToken: tokens.accessToken,
    googleTokenExpiresAt: expiresAt,
  };

  if (tokens.refreshToken) {
    updates.googleRefreshToken = encryptSecret(tokens.refreshToken);
  }
  if (tokens.email) {
    updates.googleEmail = tokens.email;
  }

  await db.update(users).set(updates).where(eq(users.id, userId as any));

  await logAudit({
    userId,
    action: 'LINK_GOOGLE_ACCOUNT',
    entityType: 'User',
    entityId: userId,
    details: `Linked Google account (${tokens.email || 'unknown email'}) for user ${userId}`,
  });
}

export async function getUserGoogleAccessToken(userId: string): Promise<string | null> {
  const [u] = await db.select().from(users).where(eq(users.id, userId as any)).limit(1);
  if (!u || !(u as any).googleRefreshToken) {
    return null;
  }

  const currentToken = (u as any).googleAccessToken;
  const expiresAtStr = (u as any).googleTokenExpiresAt;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr).getTime() : 0;
  const now = Date.now();

  // If token is valid for at least another 60 seconds, reuse it
  if (currentToken && expiresAt > now + 60000) {
    return currentToken;
  }

  // Refresh token using stored refresh_token
  const refreshToken = decryptSecret((u as any).googleRefreshToken);
  if (!refreshToken) return null;

  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.warn('[GOOGLE_TOKEN_REFRESH_FAILED]', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await db
      .update(users)
      .set({
        googleAccessToken: newAccessToken,
        googleTokenExpiresAt: newExpiresAt,
      } as any)
      .where(eq(users.id, userId as any));

    return newAccessToken;
  } catch (err) {
    console.warn('[GOOGLE_TOKEN_REFRESH_EXCEPTION]', err);
    return null;
  }
}

export async function disconnectGoogleAccount(userId: string): Promise<void> {
  const [u] = await db.select().from(users).where(eq(users.id, userId as any)).limit(1);
  if (u && (u as any).googleRefreshToken) {
    const refreshToken = decryptSecret((u as any).googleRefreshToken);
    if (refreshToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${refreshToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch {
        // Ignore revocation error if token was already revoked
      }
    }
  }

  await db
    .update(users)
    .set({
      googleEmail: null,
      googleRefreshToken: null,
      googleAccessToken: null,
      googleTokenExpiresAt: null,
      googleRootFolderId: null,
      googleAutoSync: false,
    } as any)
    .where(eq(users.id, userId as any));

  await logAudit({
    userId,
    action: 'DISCONNECT_GOOGLE_ACCOUNT',
    entityType: 'User',
    entityId: userId,
    details: `Disconnected Google account for user ${userId}`,
  });
}

export async function getUserGoogleStatus(userId: string): Promise<GoogleAuthStatus> {
  const [u] = await db.select().from(users).where(eq(users.id, userId as any)).limit(1);
  if (!u) {
    return { isConnected: false, autoSync: false };
  }

  return {
    isConnected: Boolean((u as any).googleRefreshToken),
    email: (u as any).googleEmail || undefined,
    autoSync: Boolean((u as any).googleAutoSync),
    rootFolderId: (u as any).googleRootFolderId || undefined,
  };
}

export async function updateUserGoogleSettings(
  userId: string,
  settings: { autoSync?: boolean; rootFolderId?: string }
): Promise<GoogleAuthStatus> {
  const updates: Record<string, any> = {};
  if (settings.autoSync !== undefined) updates.googleAutoSync = settings.autoSync;
  if (settings.rootFolderId !== undefined) updates.googleRootFolderId = settings.rootFolderId;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId as any));
  }

  return getUserGoogleStatus(userId);
}
