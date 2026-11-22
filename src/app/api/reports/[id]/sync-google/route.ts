// Layer 1 (Transport): Report Google Docs Synchronization Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { syncReportToGoogleDocs } from '@/services/google-docs-sync.service';

export const POST = withAuth(
  async (_req: NextRequest, { user, params }) => {
    const reportId = params?.id;
    if (!reportId || reportId === 'new') {
      return NextResponse.json({ success: false, error: 'Valid Report ID required for Google Doc sync' }, { status: 400 });
    }

    try {
      const result = await syncReportToGoogleDocs({
        reportId,
        userId: user.id,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || 'Google Doc synchronization failed' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        googleDocId: result.googleDocId,
        googleDocUrl: result.googleDocUrl,
        syncedAt: result.syncedAt,
        message: 'Report successfully synchronized to Google Docs.',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Error syncing to Google Docs' }, { status: 500 });
    }
  },
  {
    roles: ['radiologist', 'resident', 'consultant', 'pgr', 'admin'],
    audit: { action: 'SYNC_GOOGLE_DOC', entityType: 'Report' },
  }
);
