import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/services/auth.service';
import { inviteService } from '@/services/invite.service';
import { RedeemInviteSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const json = await req.json();
    const result = RedeemInviteSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.errors[0].message }, { status: 400 });
    }

    const { inviteCode } = result.data;
    const redemption = await inviteService.redeemInviteCode(inviteCode, user.id);

    if (!redemption.success) {
      return NextResponse.json({ success: false, error: redemption.error || 'Failed to redeem invite code' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Alpha invite code redeemed successfully! Welcome to Rad Suite.',
      data: redemption.user,
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Redeem invite error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error redeeming invite code', requestId },
      { status: 500 }
    );
  }
}
