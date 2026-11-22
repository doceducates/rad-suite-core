import { NextRequest, NextResponse } from 'next/server';
import { getSliceAnnotations } from '@/services/anatomy.service';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth<{ sliceId: string }>(
  async (_req: NextRequest, { user, params }) => {
    if (!rbacService.canAccessScreen(user, 'atlas')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Atlas access required' }, { status: 403 });
    }
    const rawId = params?.sliceId;
    if (!rawId) {
      return NextResponse.json({ success: false, error: 'Slice ID is required' }, { status: 400 });
    }
    const idNum = parseInt(rawId, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'Invalid slice ID' }, { status: 400 });
    }
    const data = getSliceAnnotations(idNum);
    return NextResponse.json(
      { success: true, ...data },
      {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      }
    );
  }
);
