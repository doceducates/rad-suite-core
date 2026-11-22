import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { HmisSearchQuerySchema } from '@/lib/validation';
import { searchHmisPatient } from '@/services/hmis/hmis-gateway-client.service';
import { getUserHmisCredentials } from '@/services/auth.service';

/**
 * GET /api/hmis/search?mrn=...&accession=...
 * Searches HMIS portal worklist and tracking records with intelligent date range auto-expansion.
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const { searchParams } = new URL(req.url);
    const parsed = HmisSearchQuerySchema.safeParse({
      mrn: searchParams.get('mrn') || undefined,
      accession: searchParams.get('accession') || undefined,
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

    const result = await searchHmisPatient(parsed.data, credentials);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to search patient in HMIS' },
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
      action: 'hmis_patient_search',
      entityType: 'Patient',
      details: 'Searched patient investigation in Punjab HMIS portal via microservice gateway',
    },
  }
);
