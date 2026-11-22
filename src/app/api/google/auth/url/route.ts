// Layer 1 (Transport): Google OAuth Authorization URL Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getGoogleAuthUrl, getGoogleOAuthCredentials } from '@/services/google-auth.service';

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const reqBaseUrl = host ? `${proto}://${host}` : undefined;

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
      const state = Buffer.from(JSON.stringify({ userId: user.id, timestamp: Date.now() })).toString('base64url');
      const authUrl = getGoogleAuthUrl(state, reqBaseUrl);
      return NextResponse.json({ success: true, configured: true, url: authUrl });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed generating Google auth URL' },
        { status: 500 }
      );
    }
  },
  { roles: ['radiologist', 'resident', 'consultant', 'pgr', 'admin'] }
);
