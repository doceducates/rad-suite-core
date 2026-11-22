// Layer 1 (Transport): Desktop Session Init Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { initDesktopAuthRequest } from '@/services/desktop-auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const reqBaseUrl = host ? `${proto}://${host}` : undefined;

    const { id, authUrl } = initDesktopAuthRequest({
      intent: body.intent || 'login',
      inviteCode: body.inviteCode || undefined,
      redirect: body.redirect || '/worklist',
      customAppUrl: reqBaseUrl,
    });

    return NextResponse.json({ success: true, id, authUrl });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed initiating desktop authentication' },
      { status: 500 }
    );
  }
}
