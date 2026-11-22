import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { claimCase } from '@/services/case-allocation.service';

/**
 * POST /api/cases/[accession]/claim
 * Claims a case for the authenticated radiologist or resident.
 */
export const POST = withAuth(
  async (req: NextRequest, { params, user }: { params?: { accession?: string }; user?: any } = {}) => {
    const accession = params?.accession;
    if (!accession) {
      return NextResponse.json({ success: false, error: 'Accession number is required' }, { status: 400 });
    }

    let force = false;
    try {
      const body = await req.json();
      force = Boolean(body?.force);
    } catch {}

    const result = await claimCase(accession, { id: user?.id, name: user?.name || 'Radiologist' }, force);

    if (!result.success) {
      const status = result.conflict ? 409 : (result.code === 'GOOGLE_DRIVE_REQUIRED' ? 403 : 400);
      return NextResponse.json({ success: false, error: result.message, code: result.code, conflict: result.conflict, data: result }, { status });
    }

    return NextResponse.json({ success: true, data: result, claim: result });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'CLAIM_CASE',
      entityType: 'Study',
      details: 'Radiologist claimed case for reporting',
    },
  }
);
