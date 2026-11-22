import { NextRequest, NextResponse } from 'next/server';
import { getMaskBuffer } from '@/services/anatomy.service';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    if (!rbacService.canAccessScreen(user, 'atlas')) {
      return NextResponse.json({ error: 'Forbidden: Atlas access required' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const moduleCode = searchParams.get('module');
    const layer = searchParams.get('layer');
    const sliceSort = parseInt(searchParams.get('slice') || '1', 10);
    const globalSlice = parseInt(searchParams.get('globalSlice') || '0', 10);

    if (!moduleCode || !layer || !sliceSort) {
      return NextResponse.json({ error: 'Missing module, layer, or slice parameters' }, { status: 400 });
    }

    const buffer = getMaskBuffer(moduleCode, layer, sliceSort, globalSlice);
    if (!buffer) {
      return NextResponse.json({ error: 'Mask not found' }, { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
);
