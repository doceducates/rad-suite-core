import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { fetchActiveInvestigation } from '@/services/hmis/hmis-gateway-client.service';
import { syncHmisInvestigation } from '@/services/hmis/hmis-sync.service';

/**
 * GET /api/hmis/investigation
 * Fetches the currently opened investigation in Punjab HMIS portal
 * and synchronizes the patient demographic record into Rad Suite.
 */
export const GET = withAuth(
  async (_req: NextRequest, { user }) => {
    const gatewayResult = await fetchActiveInvestigation();

    if (!gatewayResult.success || !gatewayResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: gatewayResult.error || 'No active investigation open on HMIS portal',
        },
        { status: 502 }
      );
    }

    const details = gatewayResult.data;
    let syncResult = null;

    if (details.mrn && details.investigationId) {
      try {
        syncResult = await syncHmisInvestigation(details, user.id, user.name);
      } catch (err) {
        console.warn('[HMIS_SYNC_WARN] Local sync failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: details,
      localSync: syncResult,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_fetch_investigation',
      entityType: 'HMIS_Investigation',
      details: 'Fetched active patient investigation from Punjab HMIS portal',
    },
  }
);
