// Layer 2 (Domain/Services): Google OAuth Login & Clinician Authentication Orchestration
import crypto from 'crypto';
import { eq, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, inviteCodes } from '@/db/schema';
import { createSession, hashPassword } from './auth.service';
import { inviteService } from './invite.service';
import { logAudit } from './audit.service';
import { getGoogleOAuthCredentials, exchangeGoogleAuthCode } from './google-auth.service';
import { encryptSecret } from '@/lib/crypto';
import { config } from '@/lib/config';
import type { UserRole } from '@/types';

export { renderOAuthCallbackHtml, renderOAuthErrorHtml } from './google-oauth-templates';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

const ATLAS_SCOPES = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
const CLINICAL_SCOPES = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file';

export interface GoogleLoginState {
  intent: 'login' | 'register' | 'link';
  mode?: 'web' | 'desktop' | 'popup';
  desktopAuthId?: string;
  inviteCode?: string;
  role?: string;
  redirect?: string;
  userId?: string;
  timestamp: number;
}

export function getGoogleLoginAuthUrl(options: {
  intent?: 'login' | 'register';
  mode?: 'web' | 'desktop' | 'popup';
  desktopAuthId?: string;
  inviteCode?: string;
  redirect?: string;
  customAppUrl?: string;
}): string {
  const { clientId, redirectUri, configured } = getGoogleOAuthCredentials(options.customAppUrl);
  if (!configured) {
    throw new Error('Google OAuth credentials not configured in system environment.');
  }

  const isAtlas = (options.customAppUrl?.toLowerCase().includes('atlas') ?? false) || config.isAtlasMode;
  const defaultRedirect = isAtlas ? '/dashboard' : '/worklist';

  const statePayload: GoogleLoginState = {
    intent: options.intent || 'login',
    mode: options.mode || 'web',
    desktopAuthId: options.desktopAuthId,
    inviteCode: options.inviteCode?.trim().toUpperCase(),
    redirect: options.redirect || defaultRedirect,
    timestamp: Date.now(),
  };

  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');
  const scope = isAtlas ? ATLAS_SCOPES : CLINICAL_SCOPES;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function handleGoogleOAuthLogin(params: {
  code: string;
  state?: string;
  customAppUrl?: string;
  ipAddress?: string;
}): Promise<{
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  sessionToken: string;
  isNewUser: boolean;
  targetUrl: string;
}> {
  let statePayload: Partial<GoogleLoginState> = {};
  if (params.state) {
    try {
      statePayload = JSON.parse(Buffer.from(params.state, 'base64url').toString('utf8'));
    } catch {
      // Ignored if state decoding fails
    }
  }

  const tokens = await exchangeGoogleAuthCode(params.code, params.customAppUrl);
  if (!tokens.email) {
    throw new Error('Unable to retrieve verified email address from Google account.');
  }

  const cleanEmail = tokens.email.trim().toLowerCase();
  const ip = params.ipAddress || '127.0.0.1';
  const masterAdminEmails = [
    'mudassir@radsuite.pk',
    (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase(),
    (process.env.MASTER_ADMIN_EMAIL || '').toLowerCase(),
  ].filter(Boolean);
  const isMasterAdmin = masterAdminEmails.includes(cleanEmail);

  // 1. Check if user already exists by googleEmail OR standard email
  const [existingUser] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.googleEmail, cleanEmail),
        eq(sql`lower(${users.email})`, cleanEmail)
      )
    )
    .limit(1);

  if (existingUser) {
    if (existingUser.status === 'disabled') {
      throw new Error('Your account has been suspended by the administrator. Contact Dr. Mudassir for assistance.');
    }

    const updates: Record<string, any> = {
      googleEmail: cleanEmail,
      googleAccessToken: tokens.accessToken,
      googleTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    };
    if (tokens.refreshToken) {
      updates.googleRefreshToken = encryptSecret(tokens.refreshToken);
    }
    if (isMasterAdmin && (existingUser.role !== 'admin' || existingUser.status !== 'active')) {
      updates.role = 'admin';
      updates.status = 'active';
      updates.allowedScreens = JSON.stringify(['*']);
      existingUser.role = 'admin';
      existingUser.status = 'active';
    }
    await db.update(users).set(updates).where(eq(users.id, existingUser.id));

    const sessionToken = await createSession(existingUser.id);

    await logAudit({
      userId: existingUser.id,
      userName: existingUser.name,
      action: 'login',
      entityType: 'Auth',
      details: 'Clinician authenticated via Google OAuth',
      ipAddress: ip,
    });

    const isWaitlisted = existingUser.status === 'waitlisted' || existingUser.status === 'pending_invite';
    const isAtlasTarget = config.isAtlasMode || existingUser.role === 'student' || (params.customAppUrl?.toLowerCase().includes('atlas') ?? false) || Boolean(statePayload.redirect?.includes('atlas'));
    let targetUrl = isWaitlisted ? '/pending-access' : (statePayload.redirect || (isAtlasTarget ? '/dashboard' : '/worklist'));
    if (isAtlasTarget && (targetUrl === '/worklist' || targetUrl === '/my-cases')) {
      targetUrl = '/dashboard';
    }

    const authResult = {
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        status: existingUser.status,
      },
      sessionToken,
      isNewUser: false,
      targetUrl,
    };

    if (statePayload.desktopAuthId) {
      try {
        const { completeDesktopAuthRequest } = await import('./desktop-auth.service');
        completeDesktopAuthRequest(statePayload.desktopAuthId, authResult);
      } catch (err) {
        console.warn('[DESKTOP_AUTH_HANDOFF_WARN]', err);
      }
    }

    return authResult;
  }

  // 2. New Clinician Registration via Google OAuth
  let assignedRole: UserRole = 'consultant';
  let assignedTitle = 'Consultant Radiologist';
  let assignedStatus: 'active' | 'waitlisted' = 'waitlisted';
  let allowedScreens = JSON.stringify(['my_cases', 'worklist', 'workstation', 'studio']);
  let inviteCodeUsed: string | undefined = undefined;

  if (isMasterAdmin) {
    assignedRole = 'admin';
    assignedTitle = 'Super Administrator (Lead Radiologist)';
    assignedStatus = 'active';
    allowedScreens = JSON.stringify(['*']);
  } else if (statePayload.inviteCode) {
    const val = await inviteService.validateInviteCode(statePayload.inviteCode);
    if (val.valid && val.invite) {
      assignedStatus = 'active';
      assignedRole = (val.invite.role as UserRole) || 'consultant';
      assignedTitle = assignedRole === 'pgr' ? 'Resident Radiologist (PGR)' : 'Consultant Radiologist';
      allowedScreens = val.invite.allowedScreens || allowedScreens;
      inviteCodeUsed = val.invite.code;

      await db
        .update(inviteCodes)
        .set({ usesCount: (Number(val.invite.usesCount || 0) + 1) as any })
        .where(eq(inviteCodes.id, val.invite.id));
    }
  } else if (config.isAtlasMode || statePayload.role === 'student') {
    assignedRole = 'student';
    assignedTitle = 'Medical Student / Anatomy Learner';
    assignedStatus = 'active';
    allowedScreens = JSON.stringify(['dashboard', 'atlas', 'settings']);
  } else {
    const existingCount = await db.select({ id: users.id }).from(users).limit(1);
    if (existingCount.length === 0 && (process.env.BOOTSTRAP_ADMIN === 'true' || process.env.NODE_ENV === 'test')) {
      assignedRole = 'admin';
      assignedTitle = 'System Administrator';
      assignedStatus = 'active';
      allowedScreens = JSON.stringify(['*']);
    }
  }

  const avatarColors = ['#4a7c59', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#8ecf9e'];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
  const displayName = tokens.name?.trim() || cleanEmail.split('@')[0];
  const newUserId = crypto.randomUUID();
  const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));

  await db.insert(users).values({
    id: newUserId,
    name: displayName,
    email: cleanEmail,
    passwordHash,
    role: assignedRole,
    title: assignedTitle,
    status: assignedStatus,
    allowedScreens,
    inviteCodeUsed: inviteCodeUsed || null,
    licenseNo: '',
    department: 'Radiology',
    avatarColor,
    googleEmail: cleanEmail,
    googleAccessToken: tokens.accessToken,
    googleRefreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
    googleTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    createdAt: new Date(),
  } as any);

  const sessionToken = await createSession(newUserId);

  await logAudit({
    userId: newUserId,
    userName: displayName,
    action: 'register',
    entityType: 'Auth',
    details: 'Clinician registered account via Google OAuth',
    ipAddress: ip,
  });

  const isAtlasTarget = config.isAtlasMode || assignedRole === 'student' || (params.customAppUrl?.toLowerCase().includes('atlas') ?? false) || Boolean(statePayload.redirect?.includes('atlas'));
  let targetUrl = assignedStatus === 'waitlisted' ? '/pending-access' : (statePayload.redirect || (isAtlasTarget ? '/dashboard' : '/worklist'));
  if (isAtlasTarget && (targetUrl === '/worklist' || targetUrl === '/my-cases')) {
    targetUrl = '/dashboard';
  }

  const authResult = {
    user: {
      id: newUserId,
      name: displayName,
      email: cleanEmail,
      role: assignedRole,
      status: assignedStatus,
    },
    sessionToken,
    isNewUser: true,
    targetUrl,
  };

  if (statePayload.desktopAuthId) {
    try {
      const { completeDesktopAuthRequest } = await import('./desktop-auth.service');
      completeDesktopAuthRequest(statePayload.desktopAuthId, authResult);
    } catch (err) {
      console.warn('[DESKTOP_AUTH_HANDOFF_WARN]', err);
    }
  }

  return authResult;
}
