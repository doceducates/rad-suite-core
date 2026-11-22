import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { fetchHmisWorklist } from '@/services/hmis/hmis-gateway-client.service';
import { ingestHmisRecordsToDb } from '@/services/hmis/hmis-worklist-sync.service';
import { getUserHmisCredentials } from '@/services/auth.service';
import { HmisWorklistQuerySchema } from '@/lib/validation';

/**
 * GET /api/hmis/worklist
 * Fetches proceeded patients worklist from Punjab HMIS portal with filters & pagination,
 * and automatically persists all scraped records to the local database for the department worklist.
 */
export const GET = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = HmisWorklistQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid query parameters' },
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

    const result = await fetchHmisWorklist(parsed.data, credentials);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch worklist from HMIS' },
        { status: 502 }
      );
    }

    // Automatically persist freshly scraped records into local SQLite database
    const rawList = Array.isArray(result.data)
      ? result.data
      : (Array.isArray(result.data?.records) ? result.data.records : null);

    let syncSummary = null;
    if (rawList && rawList.length > 0) {
      try {
        syncSummary = await ingestHmisRecordsToDb(rawList);
      } catch (err: any) {
        console.warn('[HMIS_WORKLIST_INGEST_WARN] Failed ingesting scraped records:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      syncSummary,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_fetch_worklist',
      entityType: 'Worklist',
      details: 'Retrieved proceeded patients worklist and synchronized records to local worklist database',
    },
  }
);
