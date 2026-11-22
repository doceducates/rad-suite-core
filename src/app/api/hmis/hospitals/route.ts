import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { searchHmisHospitals } from '@/services/hmis/hmis-hospitals.data';

/**
 * GET /api/hmis/hospitals
 * Returns the catalog of predefined Punjab HMIS hospitals (78 entries)
 * with optional query filtering (?q=Lahore).
 */
export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const results = searchHmisHospitals(query);
    return NextResponse.json({
      success: true,
      total: results.length,
      data: results,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'consultant', 'pgr'],
  }
);
