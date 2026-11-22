// Layer 1 (Transport): Report Multi-Destination Sync API Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';
import {
  getRegisteredProvidersInfo,
  testSyncProvider,
  dispatchReportSync,
  getReportSyncOutboxHistory,
} from '@/services/report-sync/report-sync-dispatcher.service';

const SyncActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('test-provider'),
    providerId: z.string().min(1),
  }),
  z.object({
    action: z.literal('sync-report'),
    reportId: z.string().min(1),
  }),
]);

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId');

    const providers = await getRegisteredProvidersInfo(user.id);
    let history: any[] = [];
    if (reportId) {
      history = await getReportSyncOutboxHistory(reportId);
    }

    return NextResponse.json({
      success: true,
      providers,
      history,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist'],
  }
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
    }

    const parsed = SyncActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid sync action payload' },
        { status: 400 }
      );
    }

    if (parsed.data.action === 'test-provider') {
      const result = await testSyncProvider(parsed.data.providerId, user.id);
      return NextResponse.json(result);
    }

    if (parsed.data.action === 'sync-report') {
      const syncOutcome = await dispatchReportSync(parsed.data.reportId, user.id);
      return NextResponse.json({ success: true, ...syncOutcome });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist'],
    audit: {
      action: 'TRIGGER_REPORT_SYNC',
      entityType: 'ReportSync',
    },
  }
);
