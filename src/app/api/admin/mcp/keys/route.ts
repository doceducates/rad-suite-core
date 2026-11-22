/**
 * Admin API: Agent API Key Management
 * Layer 1 (Transport) - Under 250 lines
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { createAgentApiKey, listAgentApiKeys, revokeAgentApiKey } from '@/services/mcp-auth.service';
import { logAudit } from '@/services/audit.service';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'], req);
  if ('errorResponse' in auth) return auth.errorResponse;

  const tenantId = (auth.user as any).tenantId || 'tnt_lgh';
  const keys = await listAgentApiKeys(tenantId);
  return NextResponse.json({ success: true, keys });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin'], req);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ success: false, error: 'Key name is required' }, { status: 400 });
    }

    const tenantId = (auth.user as any).tenantId || 'tnt_lgh';
    const result = await createAgentApiKey({
      tenantId,
      name: body.name.trim(),
      userId: body.userId || auth.user.id,
      role: body.role || 'radiologist',
      scopes: Array.isArray(body.scopes) ? body.scopes : undefined,
      allowedTools: Array.isArray(body.allowedTools) ? body.allowedTools : undefined,
      isReadOnly: Boolean(body.isReadOnly),
      expiresInDays: typeof body.expiresInDays === 'number' ? body.expiresInDays : undefined,
    });

    await logAudit({
      userId: auth.user.id,
      userName: auth.user.name,
      action: 'create_agent_api_key',
      entityType: 'ApiKey',
      entityId: result.keyRecord.id,
      details: JSON.stringify({ name: body.name, tenantId, isReadOnly: body.isReadOnly }),
    });

    return NextResponse.json({
      success: true,
      apiKey: result.rawKey, // returned ONLY once on creation
      keyRecord: result.keyRecord,
      message: 'Store this API key securely. It cannot be retrieved again.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to generate key' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['admin'], req);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get('id');
    if (!keyId) {
      return NextResponse.json({ success: false, error: 'Key ID is required' }, { status: 400 });
    }

    const tenantId = (auth.user as any).tenantId || 'tnt_lgh';
    await revokeAgentApiKey(keyId, tenantId);

    await logAudit({
      userId: auth.user.id,
      userName: auth.user.name,
      action: 'revoke_agent_api_key',
      entityType: 'ApiKey',
      entityId: keyId,
      details: JSON.stringify({ keyId, tenantId }),
    });

    return NextResponse.json({ success: true, message: 'API key revoked successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to revoke key' }, { status: 500 });
  }
}
