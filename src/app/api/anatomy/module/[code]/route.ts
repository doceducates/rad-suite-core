import { NextRequest, NextResponse } from 'next/server';
import { getModuleDetails } from '@/services/anatomy.service';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth<{ code: string }>(
  async (_req: NextRequest, { user, params }) => {
    if (!rbacService.canAccessScreen(user, 'atlas')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Atlas access required' }, { status: 403 });
    }
    const code = params?.code;
    if (!code) {
      return NextResponse.json({ success: false, error: 'Module code is required' }, { status: 400 });
    }
    const mod = getModuleDetails(code);
    if (!mod) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
    }
    return NextResponse.json(
      { success: true, module: mod },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      }
    );
  }
);
