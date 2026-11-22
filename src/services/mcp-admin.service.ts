/**
 * MCP Admin Service: Tool Introspection & Tenant Tool Governance
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { db } from '@/db';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { initializeMcpRegistry, McpToolRegistry } from '@/mcp/tools';

export async function listAllRegisteredMcpTools() {
  initializeMcpRegistry();
  return McpToolRegistry.getAllTools().map((t) => ({
    name: t.name,
    description: t.description,
    category: t.category,
    requiredScope: t.requiredScope,
    isMutating: Boolean(t.isMutating),
    version: t.version || '1.0.0',
    deprecated: Boolean(t.deprecated),
  }));
}

export async function getTenantMcpConfig(tenantId: string): Promise<{ disabledTools: string[] }> {
  const [t] = await db
    .select({ settingsJson: tenants.settingsJson })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!t || !t.settingsJson) {
    return { disabledTools: [] };
  }

  try {
    const parsed = JSON.parse(t.settingsJson);
    return { disabledTools: Array.isArray(parsed.disabledMcpTools) ? parsed.disabledMcpTools : [] };
  } catch {
    return { disabledTools: [] };
  }
}

export async function updateTenantMcpConfig(tenantId: string, disabledTools: string[]) {
  const [t] = await db
    .select({ settingsJson: tenants.settingsJson })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  let settings: Record<string, any> = {};
  if (t?.settingsJson) {
    try {
      settings = JSON.parse(t.settingsJson);
    } catch {}
  }

  settings.disabledMcpTools = disabledTools;

  await db
    .update(tenants)
    .set({
      settingsJson: JSON.stringify(settings),
      updatedAt: new Date() as any,
    })
    .where(eq(tenants.id, tenantId));

  return { success: true, disabledTools };
}
