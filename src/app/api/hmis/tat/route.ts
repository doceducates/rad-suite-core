import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';
import { getUserHmisCredentials } from '@/services/auth.service';
import { getGatewayHeaders } from '@/services/hmis/hmis-gateway-transport';
import { config } from '@/lib/config';

const TatQuerySchema = z.object({
  accession: z.string().optional(),
  mrn: z.string().optional(),
}).refine(data => data.accession || data.mrn, {
  message: 'Must provide either accession or mrn',
});

/**
 * GET /api/hmis/tat?accession=...&mrn=...
 * Retrieves 8-stage turnaround time breakdown from Punjab HMIS portal.
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const { searchParams } = new URL(req.url);
    const parsed = TatQuerySchema.safeParse({
      accession: searchParams.get('accession') || undefined,
      mrn: searchParams.get('mrn') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const userCreds = user?.id ? await getUserHmisCredentials(user.id) : null;
    const q = new URLSearchParams();
    if (parsed.data.accession) q.set('accession', parsed.data.accession);
    if (parsed.data.mrn) q.set('mrn', parsed.data.mrn);

    const headers = getGatewayHeaders(userCreds || undefined);

    try {
      const res = await fetch(`${config.hmisGatewayUrl}/api/radiology/tat?${q.toString()}`, {
        headers,
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
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
      action: 'hmis_fetch_tat',
      entityType: 'Study',
      details: 'Searched turnaround time milestones in Punjab HMIS portal',
    },
  }
);
