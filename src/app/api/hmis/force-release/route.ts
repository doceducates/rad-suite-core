import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getUserHmisCredentials } from '@/services/auth.service';
import { getGatewayHeaders } from '@/services/hmis/hmis-gateway-client.service';
import { config } from '@/lib/config';

/**
 * POST /api/hmis/force-release
 * Force-terminates and releases the HMIS portal session
 * to break multi-device locks and clear session collisions.
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
      const creds = await getUserHmisCredentials(user?.id);
      const body = await req.json().catch(() => ({}));
      const headers = getGatewayHeaders(creds);

      const res = await fetch(`${gatewayUrl}/api/auth/force-release`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.ok ? 200 : 500 });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `Failed to force release session: ${err.message}` },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'consultant', 'pgr'],
    audit: {
      action: 'hmis_session_force_release',
      entityType: 'UserSession',
      details: 'User triggered force release of HMIS single-device session lock',
    },
  }
);
