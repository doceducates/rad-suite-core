import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { fetchPatientHistory } from '@/services/hmis/hmis-gateway-client.service';
import { syncHmisPriorReports, getHmisPriorReports } from '@/services/hmis/hmis-sync.service';

/**
 * GET /api/hmis/history?investigationId=56484260&patientMrn=192609002796
 * Fetches prior lab and pathology history from HMIS patientHistoryModal
 * with fallback to locally cached prior reports.
 */
export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const investigationId = req.nextUrl.searchParams.get('investigationId');
    const patientMrn = req.nextUrl.searchParams.get('patientMrn') || '';

    if (!investigationId && !patientMrn) {
      return NextResponse.json(
        { success: false, error: 'investigationId or patientMrn is required' },
        { status: 400 }
      );
    }

    // Try fetching live history from HMIS tab via gateway
    if (investigationId) {
      const live = await fetchPatientHistory(investigationId);
      if (live.success && live.data && live.data.length > 0) {
        if (patientMrn) {
          try {
            await syncHmisPriorReports(investigationId, patientMrn, live.data, user.id, user.name);
          } catch (syncErr) {
            console.warn('[HMIS_HISTORY_SYNC_WARN]', syncErr);
          }
        }
        return NextResponse.json({
          success: true,
          data: live.data,
          source: 'live_hmis',
        });
      }
    }

    // Fallback: Query local cached prior reports
    if (patientMrn) {
      const cached = await getHmisPriorReports(patientMrn);
      return NextResponse.json({
        success: true,
        data: cached,
        source: 'local_cache',
      });
    }

    return NextResponse.json({
      success: true,
      data: [],
      source: 'none',
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'hmis_fetch_patient_history',
      entityType: 'PatientHistory',
      details: 'Accessed prior patient lab and pathology history via HMIS',
    },
  }
);
