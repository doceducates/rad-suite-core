// Layer 1 (Transport): Reports API Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { ReportUpdateSchema } from '@/lib/validation';
import { saveReport, getReportByStudyOrAccession } from '@/services/report.service';

export const GET = withAuth(
  async (_req: NextRequest, { params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Report or Study ID required' }, { status: 400 });
    }
    const data = await getReportByStudyOrAccession(id);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...data });
  },
  { roles: ['resident', 'radiologist', 'admin', 'service', 'consultant', 'pgr'] }
);

export const POST = withAuth(
  async (req: NextRequest, { user, params }) => {
    const reportId = params?.id;
    const body = await req.json();
    const parsed = ReportUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.errors[0];
      const field = issue.path.length > 0 ? ` on '${issue.path.join('.')}'` : '';
      return NextResponse.json({ success: false, error: `Invalid report data: ${issue.message}${field}` }, { status: 400 });
    }

    try {
      const result = await saveReport(
        {
          ...parsed.data,
          reportId: reportId !== 'new' ? reportId : parsed.data.reportId,
        },
        user
      );

      return NextResponse.json({
        success: true,
        reportId: result.reportId,
        version: result.version,
        isNewVersion: result.isNewVersion,
        status: result.status,
        message: result.message,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed saving report' }, { status: 400 });
    }
  },
  { roles: ['resident', 'radiologist', 'admin', 'service', 'consultant', 'pgr'], audit: { action: 'save_report', entityType: 'Report' } }
);

export const PATCH = POST;
