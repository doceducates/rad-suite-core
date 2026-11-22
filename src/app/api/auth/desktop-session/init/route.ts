// Layer 1 (Transport): Desktop Session Init Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { initDesktopAuthRequest } from '@/services/desktop-auth.service';
import { config } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const reqBaseUrl = host ? `${proto}://${host}` : undefined;

    const isDesktopOrLocal =
      process.env.IS_DESKTOP === '1' ||
      !host ||
      host.includes('localhost') ||
      host.includes('127.0.0.1');

    // In Desktop/local mode, delegate session initialization to Central Cloud (Solution B)
    if (isDesktopOrLocal && !host.includes('radiology.sehatai.org')) {
      try {
        const cloudInitRes = await fetch(`${config.centralCloudUrl}/api/auth/desktop-session/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent: body.intent || 'login',
            inviteCode: body.inviteCode || undefined,
            redirect: body.redirect || '/worklist',
          }),
        });

        if (cloudInitRes.ok) {
          const cloudData = await cloudInitRes.json();
          if (cloudData.success && cloudData.id && cloudData.authUrl) {
            return NextResponse.json(cloudData);
          }
        }
      } catch (cloudErr) {
        console.warn('[DESKTOP_INIT_CLOUD_DELEGATE_WARN]', cloudErr);
      }
    }

    // Local fallback or Central Cloud native execution
    const { id, authUrl } = initDesktopAuthRequest({
      intent: body.intent || 'login',
      inviteCode: body.inviteCode || undefined,
      redirect: body.redirect || '/worklist',
      customAppUrl: isDesktopOrLocal ? config.centralCloudUrl : reqBaseUrl,
    });

    return NextResponse.json({ success: true, id, authUrl });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed initiating desktop authentication' },
      { status: 500 }
    );
  }
}
