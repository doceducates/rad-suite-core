// Layer 1 (Transport): Report Revisions API Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getReportRevisions } from '@/services/report.service';

export const GET = withAuth(
  async (_req: NextRequest, { params }) => {
    const reportId = params?.id;
    if (!reportId) {
      return NextResponse.json({ success: false, error: 'Report ID is required' }, { status: 400 });
    }

    try {
      const revisions = await getReportRevisions(reportId);
      const currentVersion = revisions[0]?.version ?? 1;

      return NextResponse.json({
        success: true,
        count: revisions.length,
        currentVersion,
        revisions,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed fetching revisions' }, { status: 500 });
    }
  },
  { roles: ['resident', 'radiologist', 'admin', 'consultant', 'pgr'] }
);
