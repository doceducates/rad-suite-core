import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import path from 'path';
import { getGatewayHeaders } from '@/services/hmis/hmis-gateway-client.service';
import { config } from '@/lib/config';

const getGatewayBase = () => config.hmisGatewayUrl;

/**
 * GET /api/hmis/screenshot/[filename]
 * Proxies visual audit screenshots generated during HMIS draft saves.
 */
export const GET = withAuth(
  async (_req: NextRequest, { params }) => {
    const rawFilename = params?.filename;
    if (!rawFilename) {
      return NextResponse.json({ success: false, error: 'Filename is required' }, { status: 400 });
    }

    const safeFilename = path.basename(rawFilename);
    try {
      const upstream = await fetch(`${getGatewayBase()}/api/radiology/screenshot/${encodeURIComponent(safeFilename)}`, {
        headers: getGatewayHeaders(),
      });
      if (!upstream.ok) {
        return NextResponse.json({ success: false, error: 'Screenshot not found' }, { status: 404 });
      }

      const blob = await upstream.arrayBuffer();
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `Gateway unreachable: ${err.message}` },
        { status: 502 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
  }
);
