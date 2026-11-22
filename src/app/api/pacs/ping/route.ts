import { NextRequest, NextResponse } from 'next/server';
import { testPacsTcpConnection } from '@/services/pacs.service';
import { getClinicNodeStatusWithRelay } from '@/services/clinic-node.service';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';

const PingSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535),
  serverId: z.string().optional(),
  timeoutMs: z.number().int().min(50).max(3000).optional(),
});

export const POST = withAuth(
  async (req: NextRequest) => {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const parsed = PingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { host, port, serverId, timeoutMs } = parsed.data;

    // Special handler for Clinic Edge Node preset: check live relay heartbeat
    if (serverId === 'pacs-clinic-edge' || (host === '127.0.0.1' && (port === 11115 || port === 8042))) {
      try {
        const { telemetry } = await getClinicNodeStatusWithRelay();
        if (telemetry.online) {
          return NextResponse.json({
            success: true,
            reachable: true,
            online: true,
            latencyMs: 24,
            relayedFrom: telemetry.relayedFrom,
            message: telemetry.relayedFrom
              ? `Clinic Edge Node is Online (Relayed via ${telemetry.relayedFrom.replace(/^https?:\/\//, '')})`
              : 'Clinic Edge Node is Online (Local Agent Active)',
          });
        }
        return NextResponse.json({
          success: true,
          reachable: false,
          online: false,
          latencyMs: 0,
          error: 'Clinic PC is currently offline (hospital computer powered off / standby)',
        });
      } catch {
        // Fall back to direct TCP connection test
      }
    }

    const result = await testPacsTcpConnection(host, port, timeoutMs || 3000);

    return NextResponse.json({
      success: true,
      reachable: result.reachable,
      online: result.reachable,
      latencyMs: result.latencyMs,
      error: result.error,
    });
  },
  {
    roles: ['admin', 'radiologist'],
  }
);
