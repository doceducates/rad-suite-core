// Layer 1 (Transport): Case-Specific HMIS Live Tracking Sync Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { syncCaseTrackingStatus } from '@/services/hmis/hmis-worklist-sync.service';

/**
 * POST /api/cases/[accession]/track-sync
 * Queries HMIS tracking endpoint live for this accession, updates milestones & status in DB.
 */
export const POST = withAuth(
  async (req: NextRequest, { params }: { params?: { accession?: string }; user?: any } = {}) => {
    const accession = params?.accession;
    if (!accession) {
      return NextResponse.json({ success: false, error: 'Accession is required' }, { status: 400 });
    }

    try {
      const tracking = await syncCaseTrackingStatus(accession);
      if (!tracking) {
        return NextResponse.json(
          { success: false, error: `No tracking record found for accession ${accession}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        tracking,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Tracking sync failed' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist'],
    audit: {
      action: 'case_track_sync',
      entityType: 'Study',
      details: 'Refreshed case tracking status from HMIS portal',
    },
  }
);
