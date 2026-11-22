import { NextRequest, NextResponse } from 'next/server';
import { eq, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { verifyPassword, hashPassword, createSession } from '@/services/auth.service';
import { logAudit } from '@/services/audit.service';
import { LoginSchema } from '@/lib/validation';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/rate-limit';

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

    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(sql`lower(${users.email})`, identifier.toLowerCase()),
          eq(sql`lower(${users.hmisUsername})`, identifier.toLowerCase())
        )
      )
      .limit(1);

    if (!user) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ success: false, error: 'Invalid email/username or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ success: false, error: 'Invalid email/username or password' }, { status: 401 });
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
