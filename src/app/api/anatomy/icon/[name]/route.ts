import { NextRequest, NextResponse } from 'next/server';
import { getIconImageBuffer } from '@/services/anatomy.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth<{ name: string }>(
  async (_req: NextRequest, { params }) => {
    const name = params?.name;
    if (!name) {
      return NextResponse.json({ error: 'Icon name is required' }, { status: 400 });
    }

    const buffer = getIconImageBuffer(name);
    if (!buffer) {
      return NextResponse.json({ error: 'Icon not found' }, { status: 404 });
    }

    const isSvg = name.endsWith('.svg') || (buffer.length > 4 && buffer.toString('utf-8', 0, 10).includes('<svg'));
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': isSvg ? 'image/svg+xml' : 'image/png',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
);
