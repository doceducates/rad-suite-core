// Layer 1 (Transport): Revoke Case Share Controller (<45 lines)
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import { revokeCaseShare } from '@/services/case-share.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    const body = await req.json();
    if (!body?.shareId) {
      return NextResponse.json({ error: 'Missing shareId parameter' }, { status: 400 });
    }

    const result = await revokeCaseShare(body.shareId, user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[SHARE_REVOKE_ROUTE_ERR]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to revoke case share' },
      { status: 500 }
    );
  }
}
