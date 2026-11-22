import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getUserHmisCredentials } from '@/services/auth.service';
import { getGatewayHeaders } from '@/services/hmis/hmis-gateway-client.service';
import { stopGatewayProcess } from '@/services/hmis/hmis-process-manager.service';
import { config } from '@/lib/config';

/**
 * POST /api/hmis/logout
 * Gracefully terminates and logs out the active HMIS portal session
 * so other devices can log in without single-device conflicts,
 * and cleanly stops the local gateway background microservice.
 */
export const POST = withAuth(
  async (_req: NextRequest, { user }) => {
    try {
      const gatewayUrl = config.hmisGatewayUrl;
      if (!gatewayUrl) {
        return NextResponse.json(
          { success: false, error: 'HMIS Gateway is not configured or disabled.' },
          { status: 503 }
        );
      }
      const creds = await getUserHmisCredentials(user?.id);
      const headers = getGatewayHeaders(creds);

      // 1. Submit portal logout form to release single-device session lock
      await fetch(`${gatewayUrl}/api/auth/logout`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(8000),
      }).catch(() => {});

      // 2. Force release any lingering storage state or locks
      await fetch(`${gatewayUrl}/api/auth/force-release`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(4000),
      }).catch(() => {});

      // 3. Stop the gateway service process cleanly
      const stopResult = await stopGatewayProcess();

      return NextResponse.json({
        success: true,
        message: 'HMIS session cleanly logged out from portal and gateway service stopped.',
        gatewayStopped: stopResult.success,
      });
    } catch (err: any) {
      // Fallback: stop process if still running
      await stopGatewayProcess().catch(() => {});
      return NextResponse.json(
        { success: false, error: `Failed to disconnect HMIS session: ${err.message}` },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_portal_logout',
      entityType: 'UserSession',
      details: 'User triggered explicit logout of HMIS portal automated session',
    },
  }
);
