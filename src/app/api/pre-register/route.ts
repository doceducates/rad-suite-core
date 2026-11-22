import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { preRegistrations, users } from '@/db/schema';
import { PreRegisterSchema } from '@/lib/validation';
import { mailService } from '@/services/mail.service';
import { logAudit } from '@/services/audit.service';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `pre-register:${ip}`;

    const limitCheck = checkRateLimit(rateLimitKey);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many pre-registration attempts. Please try again in ${limitCheck.retryAfterSeconds ?? 900} seconds.`,
        },
        { status: 429 }
      );
    }

    const json = await req.json();
    const result = PreRegisterSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fullName, email, phone, hospital, roleDesignation, modalitiesOfInterest } = result.data;
    const emailNorm = email.trim().toLowerCase();

    // Check if user already registered as full user
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailNorm)).limit(1);
    if (existingUser) {
      return NextResponse.json(
        {
          success: true,
          message: 'An account is already associated with this email. Please sign in directly.',
          isExistingUser: true,
        }
      );
    }

    // Check if pre-registration already exists
    const [existingPre] = await db.select().from(preRegistrations).where(eq(preRegistrations.email, emailNorm)).limit(1);
    if (existingPre) {
      return NextResponse.json(
        {
          success: true,
          message: 'Your pre-registration has already been received and is queued for alpha approval.',
          alreadyQueued: true,
        }
      );
    }

    const newId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await db.insert(preRegistrations).values({
      id: newId,
      fullName: fullName.trim(),
      email: emailNorm,
      phone: phone.trim(),
      hospital: hospital.trim(),
      roleDesignation: roleDesignation.trim(),
      modalitiesOfInterest: modalitiesOfInterest && modalitiesOfInterest.length > 0 ? JSON.stringify(modalitiesOfInterest) : '["CT","MRI"]',
      status: 'waitlisted',
      createdAt: nowIso,
      updatedAt: nowIso,
    } as any);

    // Fire non-blocking confirmation email
    mailService.sendAlphaPreRegistrationEmail({
      to: emailNorm,
      fullName: fullName.trim(),
      hospital: hospital.trim(),
      roleDesignation: roleDesignation.trim(),
    }).catch(() => {});

    await logAudit({
      userId: 'system',
      userName: 'PreRegistration',
      action: 'pre_register',
      entityType: 'Lead',
      details: `Clinician ${fullName} applied for alpha waitlist (${roleDesignation} at ${hospital})`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: 'Alpha pre-registration received successfully. Our team will review your application and send your invite code.',
      data: { id: newId, email: emailNorm },
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Pre-registration error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit pre-registration', requestId },
      { status: 500 }
    );
  }
}
