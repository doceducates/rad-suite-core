// Layer 1: Worklist Auto-Purge & Retention Controller
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { getWorklistRetentionMetrics, runWorklistRetentionCleanup } from '@/services/worklist-retention.service';

const RetentionActionSchema = z.object({
  action: z.enum(['purge-now']),
  daysToKeep: z.coerce.number().int().min(1).max(365).optional().default(5),
});

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get('days') || 5);
    const metrics = await getWorklistRetentionMetrics(days);
    return NextResponse.json({ success: true, metrics });
  },
  { roles: ['admin', 'radiologist', 'service'] }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const parsed = RetentionActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid retention request' },
        { status: 400 }
      );
    }

    const { daysToKeep } = parsed.data;
    const summary = await runWorklistRetentionCleanup(daysToKeep);

    return NextResponse.json({ success: true, summary });
  },
  {
    roles: ['admin', 'radiologist'],
    audit: {
      action: 'worklist_retention_manual_purge',
      entityType: 'DatabaseMaintenance',
    },
  }
);
