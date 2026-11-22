import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { HmisSearchQuerySchema } from '@/lib/validation';
import { trackHmisReport } from '@/services/hmis/hmis-gateway-client.service';
import { getUserHmisCredentials } from '@/services/auth.service';

/**
 * GET /api/hmis/track?mrn=...&accession=...
 * Retrieves 9-stage lifecycle milestones for a given investigation or accession.
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const { searchParams } = new URL(req.url);
    const parsed = HmisSearchQuerySchema.safeParse({
      mrn: searchParams.get('mrn') || undefined,
      accession: searchParams.get('accession') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const userCreds = user?.id ? await getUserHmisCredentials(user.id) : null;
    const credentials = userCreds?.username && userCreds?.password ? {
      username: userCreds.username,
      password: userCreds.password,
      hospitalId: userCreds.hospitalId,
      reportingDoctorName: userCreds.reportingDoctorName,
    } : undefined;

    const result = await trackHmisReport(parsed.data, credentials);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to track report in HMIS' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_track_report',
      entityType: 'Report',
      details: 'Tracked report lifecycle milestones in Punjab HMIS portal',
    },
  }
);
