import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { releaseCase } from '@/services/case-allocation.service';

/**
 * POST /api/cases/[accession]/release
 * Releases a case back into the unassigned pool.
 */
export const POST = withAuth(
  async (req: NextRequest, { params, user }: { params?: { accession?: string }; user?: any } = {}) => {
    let accession = params?.accession;
    if (!accession) {
      return NextResponse.json({ success: false, error: 'Accession number is required' }, { status: 400 });
    }
    try {
      accession = decodeURIComponent(accession).trim();
    } catch {}

    let force = false;
    let releaseCompanions = true;
    try {
      const body = await req.json();
      force = Boolean(body?.force) || user?.role === 'admin';
      if (typeof body?.releaseCompanions === 'boolean') {
        releaseCompanions = body.releaseCompanions;
      }
    } catch {}

    const result = await releaseCase(
      accession,
      { id: user?.id, name: user?.name || 'Radiologist' },
      force,
      releaseCompanions
    );

    if (!result.success) {
      const status = result.conflict ? 403 : 400;
      return NextResponse.json({ success: false, error: result.message, conflict: result.conflict, data: result }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result,
      releasedAccessions: result.releasedAccessions || [accession],
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'RELEASE_CASE',
      entityType: 'Study',
      details: 'Released study back to department unassigned pool',
    },
  }
);
