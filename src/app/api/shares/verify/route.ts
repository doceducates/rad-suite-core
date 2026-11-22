// Layer 1 (Transport): Consultant Share Password Verification Controller (<60 lines)
import { NextRequest, NextResponse } from 'next/server';
import { verifyConsultantShare } from '@/services/case-share.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = (body?.token || '').trim();
    const password = (body?.password || '').trim();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and Password/PIN are required' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const result = await verifyConsultantShare(token, password, ip);

    if (!result.success || !result.sessionProof) {
      return NextResponse.json({ error: result.error || 'Invalid credentials' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      sessionProof: result.sessionProof,
      expiresAt: result.expiresAt,
    });

    const isSecure = process.env.NODE_ENV === 'production';
    res.cookies.set(`rad_suite_share_${token}`, result.sessionProof, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return res;
  } catch (err: any) {
    console.error('[SHARE_VERIFY_ROUTE_ERR]', err);
    return NextResponse.json(
      { error: err?.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
