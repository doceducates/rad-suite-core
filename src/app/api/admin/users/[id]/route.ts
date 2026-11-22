import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { getCurrentUser } from '@/services/auth.service';
import { logAudit } from '@/services/audit.service';
import { UpdateUserRbacSchema } from '@/lib/validation';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const json = await req.json();
    const result = UpdateUserRbacSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 });
    }

    const { role, status, allowedScreens, allowedStorageSources, department, title, hospital, phone } = result.data;
    const updates: Record<string, any> = {};

    if (role !== undefined) updates.role = role;
    if (status !== undefined) {
      updates.status = status;
      if (status === 'active') {
        updates.activatedAt = new Date().toISOString();
      }
    }
    if (allowedScreens !== undefined) updates.allowedScreens = JSON.stringify(allowedScreens);
    if (allowedStorageSources !== undefined) updates.allowedStorageSources = JSON.stringify(allowedStorageSources);
    if (department !== undefined) updates.department = department.trim();
    if (title !== undefined) updates.title = title.trim();
    if (hospital !== undefined) updates.hospital = hospital.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    await db.update(users).set(updates as any).where(eq(users.id, id as any));

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'update_user_rbac',
      entityType: 'User',
      details: `Updated user ${id}: role=${role || 'unchanged'}, status=${status || 'unchanged'}, screens=${allowedScreens ? JSON.stringify(allowedScreens) : 'unchanged'}`,
    });

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Update user RBAC error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update user', requestId }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (currentUser.id === id) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own active administrator account' }, { status: 400 });
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, id as any)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (targetUser.email === (process.env.INITIAL_ADMIN_EMAIL || 'admin@radsuite.org')) {
      return NextResponse.json({ success: false, error: 'Primary system administrator account cannot be deleted' }, { status: 403 });
    }

    // Delete active sessions
    await db.delete(sessions).where(eq(sessions.userId, id as any));

    // Delete user record
    await db.delete(users).where(eq(users.id, id as any));

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'admin_delete_user',
      entityType: 'User',
      details: `Deleted user ${targetUser.name} (${targetUser.email})`,
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Delete user error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete user', requestId }, { status: 500 });
  }
}

