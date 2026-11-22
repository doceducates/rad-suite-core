import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { ReportPendingSchema } from '@/lib/validation';
import { setReportPending } from '@/services/report.service';

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const result = ReportPendingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const res = await setReportPending(result.data, user);
    return NextResponse.json(res);
  },
  {
    roles: ['admin', 'consultant', 'pgr', 'radiologist', 'resident'],
    audit: {
      action: 'mark_report_pending',
      entityType: 'Report',
      details: 'Clinician placed diagnostic report on hold with clinical pending reason',
    },
  }
);
