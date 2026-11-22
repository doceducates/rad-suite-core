import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const agentApiKeys = sqliteTable('agent_api_keys', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  userId: text('user_id'),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  role: text('role').notNull().default('radiologist'),
  scopes: text('scopes').notNull().default('["cases:read","reports:read","reports:draft_write","knowledge:read"]'),
  allowedTools: text('allowed_tools').notNull().default('["*"]'),
  isReadOnly: integer('is_read_only', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
});
