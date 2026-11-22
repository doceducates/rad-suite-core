import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { inArray, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { getCurrentUser } from '@/services/auth.service';
import { logAudit } from '@/services/audit.service';
import { BatchUserActionSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const json = await req.json();
    const result = BatchUserActionSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 });
    }

    const { userIds, action } = result.data;

    // Filter out root admin and self from dangerous actions
    const protectedEmails = [process.env.INITIAL_ADMIN_EMAIL || 'admin@radsuite.org'];
    const protectedUsers = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.id, userIds as any));

    const safeTargetIds = protectedUsers
      .filter((u) => u.id !== currentUser.id && !protectedEmails.includes(u.email))
      .map((u) => u.id);

    const skippedCount = userIds.length - safeTargetIds.length;

    if (safeTargetIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No eligible users to process (protected accounts or self cannot be altered via batch)',
      }, { status: 400 });
    }

    if (action === 'activate') {
      await db
        .update(users)
        .set({
          status: 'active',
          activatedAt: new Date().toISOString(),
        } as any)
        .where(inArray(users.id, safeTargetIds as any));
    } else if (action === 'suspend') {
      await db
        .update(users)
        .set({ status: 'suspended' } as any)
        .where(inArray(users.id, safeTargetIds as any));

      // Invalidate sessions for suspended users
      await db.delete(sessions).where(inArray(sessions.userId, safeTargetIds as any));
    } else if (action === 'delete') {
      // Invalidate sessions
      await db.delete(sessions).where(inArray(sessions.userId, safeTargetIds as any));

      // Delete user rows
      await db.delete(users).where(inArray(users.id, safeTargetIds as any));
    }

    await logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      action: `admin_batch_${action}`,
      entityType: 'User',
      details: `Executed batch ${action} on ${safeTargetIds.length} users (skipped: ${skippedCount})`,
    });

    return NextResponse.json({
      success: true,
      action,
      processedCount: safeTargetIds.length,
      skippedCount,
      message: `Successfully processed ${safeTargetIds.length} clinicians (${action})`,
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Batch user action error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to execute batch action', requestId }, { status: 500 });
  }
}
