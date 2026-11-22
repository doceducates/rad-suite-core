// Layer 1 (Transport): Desktop Session Poll & Cookie Provisioning Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { pollDesktopAuthRequest } from '@/services/desktop-auth.service';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from '@/services/auth-crypto';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing desktopAuthId parameter' }, { status: 400 });
  }

  const result = pollDesktopAuthRequest(id);

  if (result.status === 'completed' && result.sessionToken) {
    const res = NextResponse.json({
      success: true,
      status: 'completed',
      user: result.user,
      targetUrl: result.targetUrl || '/worklist',
    });

    res.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.IS_DESKTOP !== '1',
      path: '/',
      expires: new Date(Date.now() + SESSION_TTL_MS),
    });

    return res;
  }

  if (result.status === 'expired') {
    return NextResponse.json({ success: false, status: 'expired', error: 'Authentication handshake timed out' }, { status: 410 });
  }

  return NextResponse.json({ success: true, status: 'pending' });
}
