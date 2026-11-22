// Layer 1: Sync Status, Diagnostic Test & Manual Trigger Endpoint
import { NextRequest, NextResponse } from 'next/server';
import {
  getSyncStatusSummary,
  drainSyncOutbox,
  pullRemoteCaseUpdates,
  backfillExistingCasesToOutbox,
} from '@/services/sync/case-sync-outbox.service';
import { testVpsSyncConnection } from '@/services/sync/case-sync-client.service';
import { CaseSyncStatusActionSchema } from '@/lib/validation';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async () => {
    const summary = await getSyncStatusSummary();
    return NextResponse.json({ success: true, ...summary });
  },
  { roles: ['admin'] }
);

export const POST = withAuth(
  async (req: NextRequest) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
    }

    const parsed = CaseSyncStatusActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid action' },
        { status: 400 }
      );
    }

    if (parsed.data.action === 'test-connection') {
      const testResult = await testVpsSyncConnection();
      return NextResponse.json(testResult);
    }

    if (parsed.data.action === 'backfill-outbox') {
      const backfill = await backfillExistingCasesToOutbox();
      const summary = await getSyncStatusSummary();
      return NextResponse.json({ success: true, backfilled: backfill.enqueued, summary });
    }

    if (parsed.data.action === 'sync-now') {
      const pushResult = await drainSyncOutbox(50);
      const pullResult = await pullRemoteCaseUpdates();
      const summary = await getSyncStatusSummary();

      return NextResponse.json({
        success: true,
        push: pushResult,
        pull: pullResult,
        summary,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown sync action' }, { status: 400 });
  },
  {
    roles: ['admin'],
    audit: {
      action: 'sync_manual_trigger',
      entityType: 'Sync',
      details: 'Triggered manual sync action from administrative console',
    },
  }
);
