import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { batchReleaseCases } from '@/services/case-allocation.service';
import { z } from 'zod';

const BatchReleasePayloadSchema = z.object({
  accessions: z.array(z.string().min(1)).min(1, 'At least one accession required'),
  force: z.boolean().optional(),
  releaseCompanions: z.boolean().optional(),
});

/**
 * POST /api/cases/batch-release
 * Batch releases multiple studies back into the unassigned pool.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = BatchReleasePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid accessions' },
        { status: 400 }
      );
    }

    const result = await batchReleaseCases(
      parsed.data.accessions,
      { id: user?.id, name: user?.name || 'Radiologist' },
      parsed.data.force || user?.role === 'admin',
      parsed.data.releaseCompanions !== false
    );

    return NextResponse.json({
      success: true,
      data: result,
      released: result.released,
      conflicts: result.conflicts,
      failed: result.failed,
      allReleasedAccessions: result.allReleasedAccessions,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'BATCH_RELEASE_CASES',
      entityType: 'Study',
      details: 'Radiologist batch released cases back to unassigned worklist pool',
    },
  }
);
