import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/services/auth.service';
import { inviteService } from '@/services/invite.service';

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

    await inviteService.revokeInviteCode(id);
    return NextResponse.json({ success: true, message: 'Invite code deactivated' });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Revoke invite error:`, error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to revoke invite code', requestId }, { status: 500 });
  }
}
