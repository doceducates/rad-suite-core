import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser, verifySession } from '@/services/auth.service';
import type { User, UserRole } from '@/types';

const SYSTEM_API_USER: User = {
  id: 'api-service-account',
  email: 'api@radsuite.internal',
  name: 'External API Client',
  role: 'service',
  title: 'API Microservice',
  department: 'External Integration',
  avatarColor: '#10b981',
  createdAt: new Date(),
};

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function safeTimingEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates request authentication via either:
 * 1. Header Authorization: Bearer <token> or X-API-Key: <key> (requires API_SECRET_KEY >= 32 chars)
 * 2. HTTP-only 256-bit Session Cookie (Web Browser)
 */
export async function authenticateRequest(req?: NextRequest): Promise<{ user: User } | { errorResponse: NextResponse }> {
  // Check API Key or Bearer token if request is passed
  if (req) {
    const authHeader = req.headers.get('authorization');
    const apiKeyHeader = req.headers.get('x-api-key');
    const configuredKey = (process.env.API_SECRET_KEY || process.env.AUTH_SECRET || '').trim();

    // 1. Check API Key for microservices
    if (apiKeyHeader && configuredKey && configuredKey.length >= 32) {
      if (safeTimingEqual(apiKeyHeader.trim(), configuredKey)) {
        return { user: SYSTEM_API_USER };
      }
    }

    // 2. Check Bearer token (either system API secret or Desktop/Mobile user session token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (configuredKey && configuredKey.length >= 32 && safeTimingEqual(token, configuredKey)) {
        return { user: SYSTEM_API_USER };
      }
      // Support Desktop / Native clients authenticating with session token in Bearer header
      const userSession = await verifySession(token);
      if (userSession?.user) {
        return { user: userSession.user };
      }
    }

    // 3. Support HTTP Basic Auth (e.g. IDM or wget prompting for User ID and Password)
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        const b64 = authHeader.substring(6).trim();
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        if (colonIdx > 0) {
          const userIdentifier = decoded.substring(0, colonIdx).trim();
          const userPass = decoded.substring(colonIdx + 1);
          const { db } = await import('@/db');
          const { users } = await import('@/db/schema');
          const { or, eq, sql } = await import('drizzle-orm');
          const { verifyPassword } = await import('@/services/auth-crypto');

          const [dbUser] = await db
            .select()
            .from(users)
            .where(
              or(
                eq(sql`lower(${users.email})`, userIdentifier.toLowerCase()),
                eq(sql`lower(${users.hmisUsername})`, userIdentifier.toLowerCase()),
                eq(sql`lower(${users.name})`, userIdentifier.toLowerCase())
              )
            )
            .limit(1);

          if (dbUser && (await verifyPassword(userPass, dbUser.passwordHash))) {
            const { getUserById } = await import('@/services/auth.service');
            const fullUser = await getUserById(dbUser.id);
            if (fullUser) return { user: fullUser };
          }
        }
      } catch {}
    }

    // 4. Support download managers & external tools authenticating via query token
    const queryToken = req.nextUrl?.searchParams?.get('token') || req.nextUrl?.searchParams?.get('auth');
    if (queryToken) {
      const userSession = await verifySession(queryToken);
      if (userSession?.user) {
        return { user: userSession.user };
      }
    }

    // 5. Check cookies on req directly first if req exists
    const cookieToken = req.cookies?.get('rad_suite_session')?.value || req.cookies?.get('rad_session')?.value;
    if (cookieToken) {
      const userSession = await verifySession(cookieToken);
      if (userSession?.user) {
        return { user: userSession.user };
      }
    }
  }

  // Fallback to cookie-based session
  const user = await getCurrentUser();
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Provide a valid session cookie, Bearer token, or X-API-Key.',
        },
        { status: 401 }
      ),
    };
  }

  return { user };
}

export async function requireAuth(req?: NextRequest): Promise<{ user: User } | { errorResponse: NextResponse }> {
  return authenticateRequest(req);
}

export async function requireRole(allowedRoles: UserRole[], req?: NextRequest): Promise<{ user: User } | { errorResponse: NextResponse }> {
  const result = await requireAuth(req);
  if ('errorResponse' in result) return result;

  if (!allowedRoles.includes(result.user.role)) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: `Forbidden. Requires one of roles: ${allowedRoles.join(', ')}` },
        { status: 403 }
      ),
    };
  }
  return result;
}
