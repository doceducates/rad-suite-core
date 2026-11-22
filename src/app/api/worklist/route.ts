import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedWorklist } from '@/services/unified-case.service';
import { PacsQuerySchema } from '@/lib/validation';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      if (val === 'true') queryObj[key] = true;
      else if (val === 'false') queryObj[key] = false;
      else queryObj[key] = val;
    });

    const parsed = PacsQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const result = await getUnifiedWorklist({ ...parsed.data, currentUserId: user?.id || parsed.data.currentUserId });
    return NextResponse.json({
      success: true,
      total: result.total,
      cases: result.cases,
      stats: result.stats,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
  }
);

export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    const body = await req.json();
    const parsed = PacsQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const result = await getUnifiedWorklist({ ...parsed.data, currentUserId: user?.id || parsed.data.currentUserId });
    return NextResponse.json({
      success: true,
      total: result.total,
      cases: result.cases,
      stats: result.stats,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
    audit: {
      action: 'query_worklist',
      entityType: 'Study',
    },
  }
);
