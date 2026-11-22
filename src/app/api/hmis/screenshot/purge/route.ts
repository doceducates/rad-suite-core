import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getGatewayHeaders } from '@/services/hmis/hmis-gateway-client.service';
import { config } from '@/lib/config';

const getGatewayBase = () => config.hmisGatewayUrl;

/**
 * DELETE /api/hmis/screenshot/purge
 * On-demand purge of ephemeral audit screenshots older than X minutes (default 20m).
 */
export const DELETE = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const olderThanMinutes = searchParams.get('olderThanMinutes') || '20';

      const upstream = await fetch(
        `${getGatewayBase()}/api/radiology/screenshot/purge?olderThanMinutes=${encodeURIComponent(olderThanMinutes)}`,
        {
          method: 'DELETE',
          headers: getGatewayHeaders(),
        }
      );

      const data = await upstream.json().catch(() => ({}));
      return NextResponse.json({
        success: upstream.ok,
        data: data.data || data,
        message: data.message || 'Ephemeral screenshots purged',
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `Failed to purge screenshots: ${err.message}` },
        { status: 502 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
  }
);
