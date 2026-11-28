import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getCurrentUser, hashPassword } from '@/services/auth.service';
import { logAudit } from '@/services/audit.service';
import { CreateUserSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        phone: users.phone,
        hospital: users.hospital,
        allowedScreens: users.allowedScreens,
        title: users.title,
        licenseNo: users.licenseNo,
        department: users.department,
        avatarColor: users.avatarColor,
        inviteCodeUsed: users.inviteCodeUsed,
        activatedAt: users.activatedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(200);

    const formatted = rows.map((u: any) => ({
      ...u,
      allowedScreens: (() => {
        try {
          return JSON.parse(u.allowedScreens || '["*"]');
        } catch {
          return ['*'];
        }
      })(),
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] List users error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to list users', requestId }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const json = await req.json();
    const result = CreateUserSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password, role, status, allowedScreens, title, department, hospital, phone, licenseNo } = result.data;
    const emailNorm = email.trim().toLowerCase();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailNorm)).limit(1);
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email address already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUserId = crypto.randomUUID();
    const avatarColors = ['#4a7c59', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#8ecf9e'];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const screensJson = allowedScreens && allowedScreens.length > 0
      ? JSON.stringify(allowedScreens)
      : JSON.stringify(['my_cases', 'hmis', 'workstation', 'studio']);

    const defaultTitle = title?.trim() || (role === 'pgr' ? 'Resident Radiologist (PGR)' : role === 'admin' ? 'Administrator' : 'Consultant Radiologist');

    await db.insert(users).values({
      id: newUserId,
      name: name.trim(),
      email: emailNorm,
      passwordHash,
      role,
      title: defaultTitle,
      status,
      phone: phone?.trim() || null,
      hospital: hospital?.trim() || null,
      allowedScreens: screensJson,
      licenseNo: licenseNo?.trim() || '',
      department: department?.trim() || 'Radiology',
      avatarColor,
      activatedAt: status === 'active' ? new Date().toISOString() : null,
      createdAt: new Date(),
    } as any);

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'admin_create_user',
      entityType: 'User',
      details: `Admin created user ${name} (${emailNorm}) with role ${role} and status ${status}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newUserId,
        name: name.trim(),
        email: emailNorm,
        role,
        title: defaultTitle,
        status,
        phone: phone?.trim() || null,
        hospital: hospital?.trim() || null,
        allowedScreens: JSON.parse(screensJson),
        department: department?.trim() || 'Radiology',
        licenseNo: licenseNo?.trim() || '',
        avatarColor,
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Create user error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create user', requestId }, { status: 500 });
  }
}

