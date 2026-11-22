import { NextRequest, NextResponse } from 'next/server';
import { getSliceBuffer, resolveSliceCacheInfo } from '@/services/anatomy.service';
import { rbacService } from '@/services/rbac.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    if (!rbacService.canAccessScreen(user, 'atlas')) {
      return NextResponse.json({ error: 'Forbidden: Atlas access required' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const moduleCode = searchParams.get('module');
    const seriesId = parseInt(searchParams.get('series') || '0', 10);
    const sliceSort = parseInt(searchParams.get('slice') || '1', 10);
    const contrast = searchParams.get('contrast') || '';

    if (!moduleCode || !seriesId || !sliceSort) {
      return NextResponse.json({ error: 'Missing module, series, or slice parameters' }, { status: 400 });
    }

    // Check on-disk private cache first
    const cacheInfo = resolveSliceCacheInfo(moduleCode, seriesId, sliceSort, contrast);

    // If slice is not yet cached on disk, generate it via getSliceBuffer
    let buffer: Buffer | null = null;
    if (!cacheInfo.exists) {
      buffer = getSliceBuffer(moduleCode, seriesId, sliceSort, contrast);
      if (!buffer) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }
    }

    // High-performance Nginx kernel offloading via X-Accel-Redirect when available
    const useAccel = process.env.ENABLE_ACCEL_REDIRECT === 'true';
    if (useAccel) {
      return new Response(null, {
        status: 200,
        headers: {
          'X-Accel-Redirect': cacheInfo.internalUri,
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'private, no-transform, max-age=2592000, immutable',
        },
      });
    }

    // Standalone / development / testing direct buffer response
    if (!buffer) {
      buffer = getSliceBuffer(moduleCode, seriesId, sliceSort, contrast);
    }
    if (!buffer) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
);
