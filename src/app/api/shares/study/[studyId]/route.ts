// Layer 1 (Transport): List Shares for Study Controller (<40 lines)
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import { listSharesForStudy } from '@/services/case-share.service';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ studyId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    const { studyId } = await params;
    if (!studyId) {
      return NextResponse.json({ error: 'Missing studyId parameter' }, { status: 400 });
    }

    const shares = await listSharesForStudy(studyId);
    return NextResponse.json({ success: true, shares });
  } catch (err: any) {
    console.error('[SHARE_LIST_ROUTE_ERR]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to list shares for study' },
      { status: 500 }
    );
  }
}
