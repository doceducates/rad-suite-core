// Layer 1 (Transport): Batch Case Deletion Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { batchDeleteCasesFromIndex } from '@/services/case-deletion.service';
import { z } from 'zod';

const BatchDeleteSchema = z.object({
  accessions: z.array(z.string()).default([]),
  olderThanHours: z.number().optional(),
  unassignedOnly: z.boolean().default(true),
  preserveReported: z.boolean().default(true),
  reason: z.string().default('Batch cleanup from workstation index'),
});

export const POST = withAuth(
  async (req: NextRequest, { user }: any = {}) => {
    try {
      const body = await req.json();
      const parsed = BatchDeleteSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message || 'Invalid payload' },
          { status: 400 }
        );
      }

      const { accessions, olderThanHours, unassignedOnly, preserveReported, reason } = parsed.data;

      if (accessions.length === 0 && (!olderThanHours || olderThanHours <= 0)) {
        return NextResponse.json(
          { success: false, error: 'Must provide either accessions or olderThanHours to prune' },
          { status: 400 }
        );
      }

      const userCtx = {
        id: user?.id || 'anonymous',
        name: user?.name || 'Radiologist',
        role: user?.role || 'radiologist',
      };

      const result = await batchDeleteCasesFromIndex(accessions, userCtx, {
        olderThanHours,
        unassignedOnly,
        preserveReported,
        reason,
      });

      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed batch deleting cases' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['resident', 'radiologist', 'admin'],
    audit: { action: 'batch_delete_cases', entityType: 'Study' },
  }
);
