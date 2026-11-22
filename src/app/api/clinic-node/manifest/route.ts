import { NextRequest, NextResponse } from 'next/server';
import { getClinicScriptManifest } from '@/services/clinic-node-manifest.service';

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

export async function GET(req: NextRequest) {
  try {
    if (!isTokenAuthorized(req)) {
      const cookie = req.cookies.get('rad_suite_session')?.value || req.cookies.get('rad_session')?.value;
      if (!cookie && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, error: 'Unauthorized clinic token' }, { status: 401 });
      }
    }

    const manifest = getClinicScriptManifest();
    return NextResponse.json({ success: true, ...manifest });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to retrieve manifest' }, { status: 500 });
  }
}
