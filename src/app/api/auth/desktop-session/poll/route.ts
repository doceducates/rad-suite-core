// Layer 1 (Transport): Desktop Session Poll & Cookie Provisioning Endpoint
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { eq, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { pollDesktopAuthRequest } from '@/services/desktop-auth.service';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from '@/services/auth-crypto';
import { config } from '@/lib/config';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing desktopAuthId parameter' }, { status: 400 });
  }

  // 1. Check local in-memory store
  let result = pollDesktopAuthRequest(id);

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const isDesktopOrLocal =
    process.env.IS_DESKTOP === '1' ||
    !host ||
    host.includes('localhost') ||
    host.includes('127.0.0.1');

  // 2. In Desktop/local mode, query Central Cloud if local handshake is not completed (Solution B)
  if (isDesktopOrLocal && !host.includes('radiology.sehatai.org') && result.status !== 'completed') {
    try {
      const cloudPollUrl = `${config.centralCloudUrl}/api/auth/desktop-session/poll?id=${encodeURIComponent(id)}`;
      const cloudRes = await fetch(cloudPollUrl);
      if (cloudRes.ok) {
        const cloudData = await cloudRes.json();
        if (cloudData.status === 'completed' && cloudData.sessionToken) {
          result = cloudData;
        } else if (cloudData.status === 'expired') {
          return NextResponse.json({ success: false, status: 'expired', error: 'Authentication handshake timed out' }, { status: 410 });
        }
      }
    } catch (cloudErr) {
      console.warn('[DESKTOP_POLL_CLOUD_DELEGATE_WARN]', cloudErr);
    }
  }

  if (result.status === 'completed' && result.sessionToken) {
    // 3. Reconcile user and session into local database for seamless offline/desktop authorization
    if (result.user && isDesktopOrLocal) {
      try {
        const cloudUser = result.user;
        const cleanEmail = (cloudUser.email || '').trim().toLowerCase();
        const [existing] = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.id, cloudUser.id),
              eq(sql`lower(${users.email})`, cleanEmail)
            )
          )
          .limit(1);

        if (!existing) {
          const dummyHash = `$2b$10$${crypto.randomBytes(30).toString('hex').slice(0, 53)}`;
          await db.insert(users).values({
            id: cloudUser.id,
            name: cloudUser.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            passwordHash: dummyHash,
            role: cloudUser.role || 'consultant',
            title: cloudUser.title || (cloudUser.role === 'admin' ? 'Super Administrator' : 'Consultant Radiologist'),
            status: cloudUser.status || 'active',
            allowedScreens: JSON.stringify(cloudUser.allowedScreens || ['*']),
            avatarColor: cloudUser.avatarColor || '#4a7c59',
            licenseNo: '',
            department: 'Radiology',
            createdAt: new Date(),
          } as any);
        } else {
          await db.update(users).set({
            role: cloudUser.role || existing.role,
            status: cloudUser.status || existing.status,
            name: cloudUser.name || existing.name,
          }).where(eq(users.id, existing.id));
        }

        const effectiveUserId = existing ? existing.id : cloudUser.id;
        await db.delete(sessions).where(eq(sessions.userId, effectiveUserId));
        await db.insert(sessions).values({
          token: result.sessionToken,
          userId: effectiveUserId,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          createdAt: new Date(),
        } as any);
      } catch (dbErr) {
        console.error('[DESKTOP_LOCAL_RECONCILIATION_ERROR]', dbErr);
      }
    }

    const res = NextResponse.json({
      success: true,
      status: 'completed',
      user: result.user,
      targetUrl: result.targetUrl || '/hmis',
    });

    res.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.IS_DESKTOP !== '1',
      path: '/',
      expires: new Date(Date.now() + SESSION_TTL_MS),
    });

    return res;
  }

  if (result.status === 'expired') {
    return NextResponse.json({ success: false, status: 'expired', error: 'Authentication handshake timed out' }, { status: 410 });
  }

  return NextResponse.json({ success: true, status: 'pending' });
}
