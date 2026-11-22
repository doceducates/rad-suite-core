import { NextRequest, NextResponse } from 'next/server';
import { getSeriesAnnotations } from '@/services/anatomy.service';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth<{ seriesId: string }>(
  async (_req: NextRequest, { user, params }) => {
    if (!rbacService.canAccessScreen(user, 'atlas')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Atlas access required' },
        { status: 403 }
      );
    }
    const rawId = params?.seriesId;
    if (!rawId) {
      return NextResponse.json(
        { success: false, error: 'Series ID is required' },
        { status: 400 }
      );
    }
    const idNum = parseInt(rawId, 10);
    if (isNaN(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid series ID' },
        { status: 400 }
      );
    }
    const annotations = getSeriesAnnotations(idNum);
    return NextResponse.json(
      { success: true, seriesId: idNum, annotations },
      {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      }
    );
  }
);
