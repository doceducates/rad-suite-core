/**
 * Admin API: MCP Tool Registry & Tenant Tool Toggles
 * Layer 1 (Transport) - Under 250 lines
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-guard';
import { listAllRegisteredMcpTools, getTenantMcpConfig, updateTenantMcpConfig } from '@/services/mcp-admin.service';
import { logAudit } from '@/services/audit.service';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin'], req);
  if ('errorResponse' in auth) return auth.errorResponse;

  const tenantId = (auth.user as any).tenantId || 'tnt_lgh';
  const tools = await listAllRegisteredMcpTools();
  const config = await getTenantMcpConfig(tenantId);

  return NextResponse.json({
    success: true,
    tenantId,
    tools,
    disabledTools: config.disabledTools,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(['admin'], req);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await req.json();
    if (!Array.isArray(body.disabledTools)) {
      return NextResponse.json({ success: false, error: 'disabledTools array is required' }, { status: 400 });
    }

    const tenantId = (auth.user as any).tenantId || 'tnt_lgh';
    await updateTenantMcpConfig(tenantId, body.disabledTools);

    await logAudit({
      userId: auth.user.id,
      userName: auth.user.name,
      action: 'update_tenant_mcp_tools',
      entityType: 'Tenant',
      entityId: tenantId,
      details: JSON.stringify({ disabledTools: body.disabledTools }),
    });

    return NextResponse.json({
      success: true,
      message: 'Tenant MCP tool configuration updated',
      disabledTools: body.disabledTools,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update tools' }, { status: 500 });
  }
}
