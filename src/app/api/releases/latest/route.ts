import { NextResponse } from 'next/server';
import { releaseService } from '@/services/release.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const release = releaseService.getLatestRelease();
  return NextResponse.json({
    success: true,
    release,
  });
}
