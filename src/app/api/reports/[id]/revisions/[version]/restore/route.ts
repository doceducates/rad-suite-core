// Layer 1 (Transport): Report Revision Restore Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { restoreReportRevision } from '@/services/report.service';

export const POST = withAuth(
  async (_req: NextRequest, { user, params }) => {
    const reportId = params?.id;
    const versionStr = params?.version;

    if (!reportId || !versionStr) {
      return NextResponse.json({ success: false, error: 'Report ID and Version are required' }, { status: 400 });
    }

    const versionNum = parseInt(versionStr, 10);
    if (isNaN(versionNum) || versionNum < 1) {
      return NextResponse.json({ success: false, error: 'Invalid version number' }, { status: 400 });
    }

    try {
      const result = await restoreReportRevision(reportId, versionNum, user);
      return NextResponse.json({
        success: true,
        version: result.version,
        report: result.report,
        message: `Successfully restored report to version ${versionNum}`,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed restoring revision' }, { status: 500 });
    }
  },
  {
    roles: ['resident', 'radiologist', 'admin', 'consultant', 'pgr'],
    audit: {
      action: 'restore_report_revision',
      entityType: 'Report',
    },
  }
);
