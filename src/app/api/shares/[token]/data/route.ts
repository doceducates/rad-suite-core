// Layer 1 (Transport): Consultant Shared Study Data API (<60 lines)
import { NextRequest, NextResponse } from 'next/server';
import { getSharedStudyDetails, getPublicShareMeta } from '@/services/case-share.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 });
    }

    // First check validity
    const meta = await getPublicShareMeta(token);
    if (meta.status !== 'valid') {
      return NextResponse.json(
        { error: 'Share link has expired or is invalid', reason: (meta as any).reason },
        { status: 410 }
      );
    }

    // Check proof in cookies or Authorization header
    const cookieProof = req.cookies.get(`rad_suite_share_${token}`)?.value;
    const authHeader = req.headers.get('authorization');
    const bearerProof = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
    const proof = cookieProof || bearerProof;

    if (!proof) {
      return NextResponse.json({ error: 'Password required', passwordHint: meta.passwordHint }, { status: 403 });
    }

    const data = await getSharedStudyDetails(token, proof);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error('[SHARE_DATA_ROUTE_ERR]', err);
    return NextResponse.json(
      { error: err?.message || 'Unauthorized or expired access' },
      { status: 401 }
    );
  }
}
