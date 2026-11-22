import { NextRequest, NextResponse } from 'next/server';
import { queryPacsArchive } from '@/services/pacs.service';
import { PacsQuerySchema } from '@/lib/validation';
import { withAuth } from '@/lib/api-handler';

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = PacsQuerySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const results = await queryPacsArchive({
      ...parsed.data,
      currentUserId: user?.id,
    });
    return NextResponse.json({ success: true, count: results.length, studies: results });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
    audit: {
      action: 'query_pacs_archive',
      entityType: 'Study',
    },
  }
);

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });

    const parsed = PacsQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const results = await queryPacsArchive({
      ...parsed.data,
      currentUserId: user?.id,
    });
    return NextResponse.json({ success: true, count: results.length, studies: results });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
  }
);
