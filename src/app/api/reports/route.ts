// Layer 1 (Transport): Reports Collection Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { ReportUpdateSchema } from '@/lib/validation';
import { saveReport, getReportByStudyOrAccession } from '@/services/report.service';

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('studyId') || searchParams.get('accession');
    if (!identifier) {
      return NextResponse.json({ success: false, error: 'studyId or accession query parameter required' }, { status: 400 });
    }
    const data = await getReportByStudyOrAccession(identifier);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...data });
  },
  { roles: ['resident', 'radiologist', 'admin', 'service', 'consultant', 'pgr'] }
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = ReportUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.errors[0];
      const field = issue.path.length > 0 ? ` on '${issue.path.join('.')}'` : '';
      return NextResponse.json({ success: false, error: `Invalid report data: ${issue.message}${field}` }, { status: 400 });
    }

    try {
      const result = await saveReport(parsed.data, user);
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
