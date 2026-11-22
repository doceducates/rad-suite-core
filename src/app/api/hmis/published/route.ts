import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { HmisPublishedQuerySchema } from '@/lib/validation';
import { fetchHmisPublishedReports } from '@/services/hmis/hmis-gateway-client.service';
import { getUserHmisCredentials } from '@/services/auth.service';

/**
 * GET /api/hmis/published?accession=...&mrn=...&contact=...&cnic=...
 * Searches published radiology reports across all history in Punjab HMIS portal.
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const { searchParams } = new URL(req.url);
    const parsed = HmisPublishedQuerySchema.safeParse({
      accession: searchParams.get('accession') || undefined,
      mrn: searchParams.get('mrn') || undefined,
      contact: searchParams.get('contact') || undefined,
      cnic: searchParams.get('cnic') || undefined,
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

    const result = await fetchHmisPublishedReports(parsed.data, credentials);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch published reports' },
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
      action: 'hmis_fetch_published_report',
      entityType: 'Report',
      details: 'Searched published reports archive in Punjab HMIS portal',
    },
  }
);
