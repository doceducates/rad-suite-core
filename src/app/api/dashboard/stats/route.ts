/**
 * Dashboard Realtime Telemetry API (Layer 1 Transport Controller)
 * Strictly under 250 lines invariant.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import { getDashboardSummary } from '@/services/dashboard.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';
    const summary = await getDashboardSummary(user.id, isAdmin, { includeRelay: true });
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error('[DASHBOARD_TELEMETRY_API_ERR]', error);
    // Error Shielding Invariant: Never leak raw internal errors
    return NextResponse.json(
      { error: 'Failed to retrieve clinical dashboard telemetry' },
      { status: 500 }
    );
  }
}
