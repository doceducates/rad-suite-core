import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { fetchHmisPublishedPdfStream } from '@/services/hmis/hmis-gateway-client.service';

/**
 * GET /api/hmis/published/pdf/[id]
 * Streams official published report PDF binary from Punjab HMIS portal.
 */
export const GET = withAuth(
  async (_req: NextRequest, { params }: { params?: { id?: string } }) => {
    const rawId = params?.id;
    if (!rawId) {
      return NextResponse.json(
        { success: false, error: 'Published PDF ID is required' },
        { status: 400 }
      );
    }

    try {
      const upstream = await fetchHmisPublishedPdfStream(rawId);
      if (!upstream.ok) {
        return NextResponse.json(
          { success: false, error: `HMIS PDF not found or unavailable (HTTP ${upstream.status})` },
          { status: upstream.status }
        );
      }

      const blob = await upstream.arrayBuffer();
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="hmis-published-${rawId}.pdf"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `HMIS Gateway unreachable (${err.message})` },
        { status: 502 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_download_published_pdf',
      entityType: 'Report',
      details: 'Streamed published PDF report from Punjab HMIS portal',
    },
  }
);
