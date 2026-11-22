import { NextRequest, NextResponse } from 'next/server';
import { releaseService } from '@/services/release.service';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3780';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${host}`;

  const manifest = releaseService.getTauriUpdaterPayload(baseUrl);
  return NextResponse.json(manifest);
}
