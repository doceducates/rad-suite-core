import { NextRequest, NextResponse } from 'next/server';
import { eq, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { verifyPassword, hashPassword, createSession } from '@/services/auth.service';
import { logAudit } from '@/services/audit.service';
import { LoginSchema } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/rate-limit';
import { config } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = LoginSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 });
    }

    const { email, password } = result.data;
    const identifier = email.trim();
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `${ip}:${identifier.toLowerCase()}`;

    const limitCheck = checkRateLimit(rateLimitKey);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please try again in ${limitCheck.retryAfterSeconds ?? 900} seconds.`,
        },
        { status: 429 }
      );
    }

    let [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(sql`lower(${users.email})`, identifier.toLowerCase()),
          eq(sql`lower(${users.hmisUsername})`, identifier.toLowerCase())
        )
      )
      .limit(1);

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const isDesktopOrLocal =
      process.env.IS_DESKTOP === '1' ||
      !host ||
      host.includes('localhost') ||
      host.includes('127.0.0.1');

    // In Desktop/local mode, if user is not in local SQLite, authenticate against Central Cloud Authority
    if (!user && isDesktopOrLocal && !host.includes('radiology.sehatai.org')) {
      try {
        const cloudRes = await fetch(`${config.centralCloudUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, password }),
        });

        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          if (cloudData.success && cloudData.data) {
            const cloudUser = cloudData.data;
            const newHash = await hashPassword(password);
            await db.insert(users).values({
              id: cloudUser.id,
              name: cloudUser.name,
              email: cloudUser.email.toLowerCase(),
              passwordHash: newHash,
              role: cloudUser.role,
              title: cloudUser.title || (cloudUser.role === 'admin' ? 'Super Administrator' : 'Consultant Radiologist'),
              status: cloudUser.status || 'active',
              allowedScreens: JSON.stringify(cloudUser.allowedScreens || ['*']),
              avatarColor: '#4a7c59',
              licenseNo: '',
              department: 'Radiology',
              createdAt: new Date(),
            } as any);

            const [synced] = await db.select().from(users).where(eq(users.id, cloudUser.id)).limit(1);
            user = synced;
          }
        } else if (cloudRes.status === 403) {
          const errData = await cloudRes.json().catch(() => ({}));
          return NextResponse.json(
            { success: false, error: errData.error || 'Your account has been suspended by the administrator.' },
            { status: 403 }
          );
        }
      } catch (cloudErr) {
        console.warn('[DESKTOP_LOGIN_CLOUD_FALLBACK_WARN]', cloudErr);
      }
    }

    if (!user) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ success: false, error: 'Invalid email/username or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ success: false, error: 'Invalid email/username or password' }, { status: 401 });
    }

    if (user.status === 'disabled') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended by the administrator. Contact Dr. Mudassir for assistance.' },
        { status: 403 }
      );
    }

    // Clear rate limit on successful credentials
    clearRateLimit(rateLimitKey);

    // Auto-migrate legacy SHA-256 password hash to bcrypt
    if (!user.passwordHash.startsWith('$2')) {
      const newHash = await hashPassword(password);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
    }

    await createSession(user.id);

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'login',
      entityType: 'Auth',
      details: 'Clinician authenticated successfully',
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        status: user.status || 'active',
      },
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Login error:`, error);
    return NextResponse.json({ success: false, error: 'Internal authentication error', requestId }, { status: 500 });
  }
}
