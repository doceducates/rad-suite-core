// Layer 1 (Transport): Workstation Client Inventory Endpoint
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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const list = await telemetryService.listWorkstations(limit);
    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    const requestId = crypto.randomUUID();
    console.error(`[API_ERROR][${requestId}] Workstations list failed:`, err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve workstations list', requestId },
      { status: 500 }
    );
  }
}
