// Layer 1 (Transport): Thin API Controller for HMIS Worklist Background/On-Demand Sync
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { syncHmisAndPacsWorklist } from '@/services/hmis/hmis-worklist-sync.service';
import { getUserHmisCredentials } from '@/services/auth.service';
import { HmisWorklistQuerySchema } from '@/lib/validation';

/**
 * POST /api/hmis/sync-worklist
 * Triggers background or on-demand synchronization between HMIS and PACS archives with optional filters.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    try {
      let payload: any = {};
      try {
        payload = await req.json();
      } catch {
        payload = Object.fromEntries(req.nextUrl.searchParams);
      }

      const parsed = HmisWorklistQuerySchema.safeParse(payload);
      const filters = parsed.success ? parsed.data : undefined;

      const userCreds = user?.id ? await getUserHmisCredentials(user.id) : null;
      const credentials = userCreds?.username && userCreds?.password ? {
        username: userCreds.username,
        password: userCreds.password,
        hospitalId: userCreds.hospitalId,
        reportingDoctorName: userCreds.reportingDoctorName,
      } : undefined;

      const summary = await syncHmisAndPacsWorklist(filters, credentials);
      if (summary.error) {
        return NextResponse.json(
          { success: false, error: summary.error, summary },
          { status: 502 }
        );
      }
      return NextResponse.json({
        success: true,
        summary,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'HMIS sync failed' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
    audit: {
      action: 'hmis_sync_worklist_trigger',
      entityType: 'Worklist',
      details: 'Triggered HMIS worklist synchronization with PACS',
    },
  }
);
