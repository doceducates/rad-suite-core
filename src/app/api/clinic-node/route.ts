import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getClinicNodeStatusWithRelay, dispatchClinicAction } from '@/services/clinic-node.service';
import { z } from 'zod';

const ClinicActionSchema = z.object({
  nodeId: z.string().optional(),
  action: z.enum([
    'start',
    'stop',
    'restart',
    'reboot',
    'clear-cache',
    'revert-config',
    'test-gdrive',
    'set-gdrive-folder',
    'ping-pacs',
    'exec',
    'update-script',
    'test-s3',
    'set-sync-rules',
    'harvest-pacs',
    'fetch-accession',
    'search-pacs',
    'batch-upload-s3',
    'pause-sync',
    'resume-sync',
    'set-schedule',
    'run-diagnostics',
    'register-node',
    'remove-node',
    'rename-node',
    'set-disk-cap',
    'set-heartbeat-interval',
    'set-compression',
    'set-auto-retention',
    'purge-local-study',
    'purge-synced-older-than',
    'set-harvest-schedule',
    'set-stall-watchdog',
    'set-peer-cooperation',
    'uninstall-agent',
    'save-all-settings',
    'set-wifi-networks',
    'enforce-network-policy',
    'isolate-wifi',
    'restore-wifi',
    'get-logs',
    'prune-logs',
  ]),
  payload: z.any().optional(),
});

export const GET = withAuth(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const nodeId = url.searchParams.get('nodeId') || undefined;
    const { telemetry, nodes } = await getClinicNodeStatusWithRelay(nodeId);
    return NextResponse.json({ success: true, telemetry, nodes });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
  }
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = ClinicActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid action payload' },
        { status: 400 }
      );
    }

    if (parsed.data.action === 'fetch-accession') {
      const { getUserStorageTarget, tagCaseForUserStorage } = await import('@/services/case-storage-router.service');
      const target = await getUserStorageTarget(user.id);
      if (!target.canClaim && target.reason === 'GOOGLE_DRIVE_REQUIRED') {
        return NextResponse.json(
          {
            success: false,
            code: 'GOOGLE_DRIVE_REQUIRED',
            error: 'Personal Google Drive connection is required for saving cases. Please connect Google Drive in Settings.',
          },
          { status: 403 }
        );
      }
      const acc = typeof parsed.data.payload === 'string'
        ? parsed.data.payload
        : (parsed.data.payload?.accessionNumber || parsed.data.payload?.accession);
      if (acc) {
        await tagCaseForUserStorage(acc, user.id);
      }
    }

    const result = await dispatchClinicAction(
      parsed.data.action,
      {
        id: user.id,
        name: user.name,
      },
      parsed.data.payload,
      parsed.data.nodeId
    );

    return NextResponse.json(result);
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
    audit: {
      action: 'ADMIN_CLINIC_NODE_CONTROL',
      entityType: 'ClinicNode',
    },
  }
);

export const PUT = POST;
