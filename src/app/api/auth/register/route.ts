import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { registerUser } from '@/services/auth.service';
import { logAudit } from '@/services/audit.service';
import { RegisterSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `register:${ip}`;

    const limitCheck = checkRateLimit(rateLimitKey);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many registration attempts. Please try again in ${limitCheck.retryAfterSeconds ?? 900} seconds.`,
        },
        { status: 429 }
      );
    }

    const json = await req.json();
    const result = RegisterSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { user } = await registerUser(result.data);

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'register',
      entityType: 'Auth',
      details: `User registered with role: ${user.role} (${user.title})`,
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
        status: user.status,
      },
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Registration error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal registration error', requestId },
      { status: 400 }
    );
  }
}
