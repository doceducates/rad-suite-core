// Layer 1 (Transport): Workstation Heartbeat Ingestion Endpoint
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/services/auth.service';
import { telemetryService } from '@/services/telemetry.service';
import { WorkstationHeartbeatSchema } from '@/lib/telemetry-validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const parseResult = WorkstationHeartbeatSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || 'Invalid heartbeat payload' },
        { status: 400 }
      );
    }

    const { machineId, hostname, platform, osVersion, appVersion, specs } = parseResult.data;
    const currentUser = await getCurrentUser().catch(() => null);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const result = await telemetryService.recordHeartbeat({
      machineId,
      hostname,
      platform,
      osVersion,
      appVersion,
      userId: currentUser?.id,
      userName: currentUser?.name,
      ipAddress: ip,
      metadata: specs,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Workstation heartbeat failed:`, err);
    return NextResponse.json(
      { success: false, error: 'Failed to record workstation heartbeat', requestId },
      { status: 500 }
    );
  }
}
