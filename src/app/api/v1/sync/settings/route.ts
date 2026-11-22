// Layer 1: Universal Settings Synchronization Controller
import { NextRequest, NextResponse } from 'next/server';
import { exportSettingsBundle, applySettingsBundle } from '@/services/sync/settings-sync.service';
import { getVpsSyncApiKey } from '@/services/sync/case-sync-client.service';
import { z } from 'zod';

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  const expectedKey = getVpsSyncApiKey();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKeyHeader.trim();
  return Boolean(token && token === expectedKey);
}

const SettingsSyncSchema = z.object({
  templates: z.array(z.any()).optional(),
  pacsServers: z.array(z.any()).optional(),
  clinicSettings: z.record(z.any()).optional(),
  exportedAt: z.string().optional(),
});

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid sync credentials' }, { status: 401 });
  }

  try {
    const bundle = await exportSettingsBundle();
    return NextResponse.json({
      success: true,
      settings: bundle,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed exporting settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid sync credentials' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
  }

  const parsed = SettingsSyncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message || 'Invalid settings payload' },
      { status: 400 }
    );
  }

  try {
    const result = await applySettingsBundle(parsed.data as any);
    return NextResponse.json({
      ...result,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed applying settings' }, { status: 500 });
  }
}
