/**
 * MCP Authentication, Scoping, and Context Resolution Service
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import crypto from 'crypto';
import { db } from '@/db';
import { agentApiKeys, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifySession } from './auth.service';
import { safeTimingEqual } from '@/lib/auth-guard';
import type { McpRequestContext } from '@/mcp/types';

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

export async function resolveMcpRequestContext(tokenOrKey: string): Promise<McpRequestContext | null> {
  const token = (tokenOrKey || '').trim();
  if (!token) return null;

  // 1. Check Master API Secret Key (Environment Fallback)
  const masterKey = (process.env.API_SECRET_KEY || process.env.AUTH_SECRET || '').trim();
  if (masterKey && masterKey.length >= 32 && safeTimingEqual(token, masterKey)) {
    return {
      userId: 'system-admin-mcp',
      userName: 'Master System Agent',
      userRole: 'admin',
      tenantId: 'tnt_lgh',
      scopes: ['*'],
      allowedTools: ['*'],
      isReadOnly: false,
    };
  }

  // 2. Check Database Agent API Keys (Scoped Keys)
  const keyHash = hashApiKey(token);
  const keyRecords = await db
    .select()
    .from(agentApiKeys)
    .where(eq(agentApiKeys.keyHash, keyHash))
    .limit(1);

  if (keyRecords && keyRecords.length > 0) {
    const k = keyRecords[0];
    if (!k.isActive) return null;

    if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) {
      return null;
    }

    // Update lastUsedAt asynchronously
    db.update(agentApiKeys)
      .set({ lastUsedAt: new Date() as any })
      .where(eq(agentApiKeys.id, k.id))
      .catch((err) => console.warn('[MCP_AUTH_WARN] Failed updating lastUsedAt:', err));

    let scopes: string[] = ['*'];
    let allowedTools: string[] = ['*'];
    try {
      scopes = JSON.parse(k.scopes);
    } catch {}
    try {
      allowedTools = JSON.parse(k.allowedTools);
    } catch {}

    return {
      userId: k.userId || k.id,
      userName: k.name,
      userRole: k.role,
      tenantId: k.tenantId,
      scopes,
      allowedTools,
      isReadOnly: Boolean(k.isReadOnly),
      apiKeyId: k.id,
    };
  }

  // 3. Check User Session Token (Clinician Personal Session)
  const session = await verifySession(token);
  if (session?.user) {
    const u = session.user;
    return {
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      tenantId: (u as any).tenantId || 'tnt_lgh',
      scopes: ['cases:read', 'cases:write', 'reports:read', 'reports:draft_write', 'pacs:query', 'knowledge:read', 'system:read'],
      allowedTools: ['*'],
      isReadOnly: false,
    };
  }

  return null;
}

export interface CreateAgentKeyInput {
  tenantId: string;
  name: string;
  userId?: string;
  role?: string;
  scopes?: string[];
  allowedTools?: string[];
  isReadOnly?: boolean;
  expiresInDays?: number;
}

export async function createAgentApiKey(input: CreateAgentKeyInput) {
  const rawSecret = `rs_live_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = rawSecret.substring(0, 12);
  const keyHash = hashApiKey(rawSecret);

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const newKey = {
    tenantId: input.tenantId || 'tnt_lgh',
    userId: (input.userId as any) || null,
    name: input.name.trim(),
    keyPrefix,
    keyHash,
    role: input.role || 'radiologist',
    scopes: JSON.stringify(input.scopes || ['cases:read', 'reports:read', 'reports:draft_write', 'knowledge:read']),
    allowedTools: JSON.stringify(input.allowedTools || ['*']),
    isReadOnly: Boolean(input.isReadOnly),
    isActive: true,
    expiresAt: expiresAt as any,
    createdAt: new Date() as any,
  };

  const [inserted] = await db.insert(agentApiKeys).values(newKey).returning();
  return {
    rawKey: rawSecret,
    keyRecord: inserted,
  };
}

export async function listAgentApiKeys(tenantId: string) {
  return db
    .select({
      id: agentApiKeys.id,
      tenantId: agentApiKeys.tenantId,
      userId: agentApiKeys.userId,
      name: agentApiKeys.name,
      keyPrefix: agentApiKeys.keyPrefix,
      role: agentApiKeys.role,
      scopes: agentApiKeys.scopes,
      allowedTools: agentApiKeys.allowedTools,
      isReadOnly: agentApiKeys.isReadOnly,
      isActive: agentApiKeys.isActive,
      expiresAt: agentApiKeys.expiresAt,
      lastUsedAt: agentApiKeys.lastUsedAt,
      createdAt: agentApiKeys.createdAt,
    })
    .from(agentApiKeys)
    .where(eq(agentApiKeys.tenantId, tenantId))
    .orderBy(desc(agentApiKeys.createdAt));
}

export async function revokeAgentApiKey(keyId: string, tenantId: string) {
  return db
    .update(agentApiKeys)
    .set({ isActive: false })
    .where(and(eq(agentApiKeys.id, keyId as any), eq(agentApiKeys.tenantId, tenantId)));
}
