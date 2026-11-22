import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import {
  getGatewayStatus,
  startGatewayProcess,
  stopGatewayProcess,
  restartGatewayProcess,
} from '@/services/hmis/hmis-process-manager.service';

/**
 * GET /api/hmis/status
 * Returns current status of local HMIS Gateway (port 3788) and browser worker pool.
 */
export const GET = withAuth(
  async () => {
    const status = await getGatewayStatus();
    return NextResponse.json({ success: true, ...status });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'service'],
  }
);

/**
 * POST /api/hmis/status
 * Manages (start, stop, restart) the local HMIS Gateway microservice process on-demand.
 */
export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json().catch(() => ({}));
    let result;
    if (body.action === 'restart') {
      result = await restartGatewayProcess();
    } else if (body.action === 'stop') {
      result = await stopGatewayProcess();
    } else {
      result = await startGatewayProcess();
    }
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'service'],
    audit: {
      action: 'hmis_gateway_lifecycle',
      entityType: 'SystemProcess',
      details: 'Managed lifecycle of local HMIS Gateway microservice',
    },
  }
);
