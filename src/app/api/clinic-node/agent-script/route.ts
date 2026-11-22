import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getClinicHostFiles,
  getClinicScriptManifest,
  getClinicHostDir,
} from '@/services/clinic-node-manifest.service';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const expectedSecret = process.env.CLINIC_NODE_SECRET || 'clinic-secret-token';

    if (token !== expectedSecret && req.headers.get('x-clinic-token') !== expectedSecret) {
      const cookie = req.cookies.get('rad_suite_session')?.value || req.cookies.get('rad_session')?.value;
      if (!cookie && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ success: false, error: 'Unauthorized clinic token' }, { status: 401 });
      }
    }

    const isManifest = req.nextUrl.searchParams.get('action') === 'manifest' || req.nextUrl.searchParams.get('manifest') === 'true';
    if (isManifest) {
      return NextResponse.json({ success: true, ...getClinicScriptManifest() });
    }

    const requestedFile = req.nextUrl.searchParams.get('file') || 'clinic-agent.js';
    const allowedFiles = getClinicHostFiles();
    if (!allowedFiles.includes(requestedFile)) {
      return NextResponse.json({ success: false, error: 'Forbidden file requested' }, { status: 403 });
    }

    const scriptPath = path.join(getClinicHostDir(), requestedFile);
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ success: false, error: 'File not found on server' }, { status: 404 });
    }

    const ext = path.extname(requestedFile).toLowerCase();
    if (ext === '.exe') {
      const buffer = fs.readFileSync(scriptPath);
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${requestedFile}"`,
          'Content-Length': String(buffer.length),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    let contentType = 'text/plain; charset=utf-8';
    if (ext === '.js') contentType = 'text/javascript; charset=utf-8';
    else if (ext === '.json') contentType = 'application/json; charset=utf-8';

    const code = fs.readFileSync(scriptPath, 'utf8');
    return new NextResponse(code, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
