import { NextResponse } from 'next/server';
import { getModules } from '@/services/anatomy.service';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async (_req, { user }) => {
  if (!rbacService.canAccessScreen(user, 'atlas')) {
    return NextResponse.json({ success: false, error: 'Forbidden: Atlas access required' }, { status: 403 });
  }
  const modules = getModules();
  return NextResponse.json(
    { success: true, modules },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  );
});
