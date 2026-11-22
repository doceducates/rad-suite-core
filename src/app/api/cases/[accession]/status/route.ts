import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getCaseClaimStatus } from '@/services/case-allocation.service';
import { reconcileCasePresence, analyzeDiscrepancy } from '@/services/case-reconciliation.service';

/**
 * GET /api/cases/[accession]/status
 * Returns case claim info, multi-system presence matrix, and discrepancy warning.
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params?: { accession?: string } } = {}) => {
    const accession = params?.accession;
    if (!accession) {
      return NextResponse.json({ success: false, error: 'Accession number is required' }, { status: 400 });
    }

    const [claimStatus, presence] = await Promise.all([
      getCaseClaimStatus(accession),
      reconcileCasePresence(accession),
    ]);

    const discrepancy = analyzeDiscrepancy(presence);

    return NextResponse.json({
      success: true,
      data: {
        accession,
        claim: claimStatus,
        presence,
        discrepancy,
      },
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'VIEW_CASE_STATUS',
      entityType: 'Study',
      details: 'Viewed case claim and reconciliation status',
    },
  }
);
