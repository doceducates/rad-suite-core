// Layer 1 (Transport): Google OAuth Login URL Generation Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleLoginAuthUrl } from '@/services/google-login.service';
import { getGoogleOAuthCredentials } from '@/services/google-auth.service';
import { config } from '@/lib/config';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const intent = (url.searchParams.get('intent') as any) || 'login';
  const mode = (url.searchParams.get('mode') as any) || 'popup';
  const inviteCode = url.searchParams.get('inviteCode') || undefined;
  const redirect = url.searchParams.get('redirect') || undefined;

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https';
  const reqBaseUrl = host ? `${proto}://${host}` : undefined;
  const isAtlasHost = (host?.toLowerCase().includes('atlas') ?? false) || config.isAtlasMode;
  const effectiveRedirect = isAtlasHost && (!redirect || redirect === '/hmis' || redirect === '/worklist' || redirect === '/my-cases') ? '/dashboard' : redirect;

  const { configured } = getGoogleOAuthCredentials(reqBaseUrl);
  if (!configured) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: 'Google OAuth Client ID & Secret are not configured in system environment (.env).',
      },
      { status: 400 }
    );
  }

  try {
    const authUrl = getGoogleLoginAuthUrl({
      intent,
      mode,
      inviteCode,
      redirect: effectiveRedirect,
      customAppUrl: reqBaseUrl,
    });

    return NextResponse.json({ success: true, configured: true, url: authUrl });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed generating Google OAuth login URL' },
      { status: 500 }
    );
  }
}
