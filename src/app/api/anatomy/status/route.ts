import { NextResponse } from 'next/server';
import { getAnatomyStatus } from '@/services/anatomy.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(async () => {
  const status = getAnatomyStatus();
  return NextResponse.json({ success: true, ...status });
});
