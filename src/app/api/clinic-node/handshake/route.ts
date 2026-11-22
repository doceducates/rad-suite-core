import { NextRequest, NextResponse } from 'next/server';
import { handshakeClinicNode } from '@/services/clinic-node-registration.service';
import { z } from 'zod';

const HandshakeSchema = z.object({
  hostname: z.string().optional(),
  machineGuid: z.string().optional(),
  macAddresses: z.array(z.string()).optional(),
  lanIp: z.string().optional(),
  platform: z.string().optional(),
  scriptVersion: z.string().optional(),
  requestedNodeId: z.string().optional(),
});

function isTokenAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const configuredSecret = process.env.CLINIC_NODE_SECRET?.trim();

  if (configuredSecret && configuredSecret.length > 0) {
    return token === configuredSecret || req.headers.get('x-clinic-token') === configuredSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  const devSecret = 'clinic-secret-token';
  return token === devSecret || req.headers.get('x-clinic-token') === devSecret;
}

export async function POST(req: NextRequest) {
  try {
    if (!isTokenAuthorized(req)) {
      const cookie = req.cookies.get('rad_suite_session')?.value || req.cookies.get('rad_session')?.value;
      if (!cookie) {
        return NextResponse.json({ success: false, error: 'Unauthorized clinic token' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const parsed = HandshakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid handshake payload' },
        { status: 400 }
      );
    }

    const result = await handshakeClinicNode(parsed.data);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Handshake failed' }, { status: 500 });
  }
}
