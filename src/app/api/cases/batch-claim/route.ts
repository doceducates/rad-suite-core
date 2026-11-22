import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { batchClaimCases } from '@/services/case-allocation.service';
import { z } from 'zod';

const BatchClaimPayloadSchema = z.object({
  accessions: z.array(z.string().min(1)).min(1, 'At least one accession required'),
  force: z.boolean().optional(),
});

/**
 * POST /api/cases/batch-claim
 * Batch claims multiple studies for the logged-in radiologist.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = BatchClaimPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid accessions' },
        { status: 400 }
      );
    }

    const result = await batchClaimCases(
      parsed.data.accessions,
      { id: user?.id, name: user?.name || 'Radiologist' },
      parsed.data.force
    );

    return NextResponse.json({
      success: true,
      data: result,
      claimed: result.claimed,
      conflicts: result.conflicts,
      failed: result.failed,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'BATCH_CLAIM_CASES',
      entityType: 'Study',
      details: 'Radiologist batch claimed multiple cases for reporting',
    },
  }
);
