// Layer 1 (Transport): Workstation Telemetry & System Analytics Summary Endpoint
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/services/auth.service';
import { telemetryService } from '@/services/telemetry.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Hospital Administrator access required' },
        { status: 403 }
      );
    }

    const summary = await telemetryService.getTelemetrySummary();
    return NextResponse.json({ success: true, data: summary });
  } catch (err: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Telemetry summary failed:`, err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve telemetry summary', requestId },
      { status: 500 }
    );
  }
}
