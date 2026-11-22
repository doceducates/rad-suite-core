import { NextRequest, NextResponse } from 'next/server';
import { searchStructures } from '@/services/anatomy.service';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    if (!rbacService.canAccessScreen(user, 'atlas')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Atlas access required' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const moduleFilter = searchParams.get('module') || undefined;
    const structures = searchStructures(q, limit, moduleFilter);
    return NextResponse.json({ success: true, structures });
  }
);
