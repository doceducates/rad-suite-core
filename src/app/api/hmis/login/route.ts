import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { config } from '@/lib/config';
import { getUserHmisCredentials } from '@/services/auth.service';
import { getGatewayHeaders } from '@/services/hmis/hmis-gateway-client.service';

/**
 * POST /api/hmis/login
 * Proxies login and test authentication to the HMIS gateway.
 * Falls back to user's saved encrypted HMIS credentials when body is empty.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const gatewayUrl = config.hmisGatewayUrl;
      if (!gatewayUrl) {
        return NextResponse.json(
          { success: false, error: 'HMIS Gateway is not configured or disabled.' },
          { status: 503 }
        );
      }
      const body = await req.json().catch(() => ({}));
      const userCreds = await getUserHmisCredentials(user?.id);
      const username = (body.username || userCreds.username || '').trim();
      const password = (body.password || userCreds.password || '').trim();
      const hospitalId = (body.hospitalId || userCreds.hospitalId || '19').trim();

      if (!username || !password) {
        return NextResponse.json(
          { success: false, error: 'HMIS credentials not configured. Please save your username and password in Settings.' },
          { status: 400 }
        );
      }

      const payload = { username, password, hospitalId };
      const headers = getGatewayHeaders(payload);

      const res = await fetch(`${gatewayUrl}/api/auth/login`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(65000),
      });

      const data = await res.json();
      return NextResponse.json(data, { status: res.ok ? 200 : res.status });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `Gateway authentication error: ${err.message}` },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'consultant', 'pgr'],
    audit: {
      action: 'hmis_portal_login_test',
      entityType: 'UserSession',
      details: 'User authenticated against HMIS portal via gateway',
    },
  }
);
