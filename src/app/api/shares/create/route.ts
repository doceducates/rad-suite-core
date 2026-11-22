// Layer 1 (Transport): Consultant Case Share Creation Controller (<50 lines)
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import { createCaseShare } from '@/services/case-share.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    const body = await req.json();
    if (!body?.studyId) {
      return NextResponse.json({ error: 'Missing studyId parameter' }, { status: 400 });
    }

    const share = await createCaseShare(user.id, {
      studyId: body.studyId,
      password: body.password,
      passwordHint: body.passwordHint,
      durationHours: body.durationHours,
      expiresAt: body.expiresAt,
      maxViews: body.maxViews,
    });

    return NextResponse.json({ success: true, share });
  } catch (err: any) {
    console.error('[SHARE_CREATE_ROUTE_ERR]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create consultant case share' },
      { status: 500 }
    );
  }
}
