import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { HmisTrackingListQuerySchema } from '@/lib/validation';
import { fetchHmisTrackingList } from '@/services/hmis/hmis-gateway-client.service';
import { getUserHmisCredentials } from '@/services/auth.service';

/**
 * GET /api/hmis/tracking-list
 * Retrieves radiology tracking list with full filters, pagination, CNIC, and phone numbers.
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      if (value !== undefined && value !== null && value !== '') {
        queryObj[key] = value;
      }
    }

    const parsed = HmisTrackingListQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid tracking list query parameters' },
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

    const result = await fetchHmisTrackingList(parsed.data, credentials);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch tracking list from HMIS' },
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
      action: 'hmis_tracking_list',
      entityType: 'Report',
      details: 'Retrieved HMIS radiology tracking list with patient contacts and milestone timelines',
    },
  }
);
