import { pgTable, text, timestamp, boolean, uuid, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const agentApiKeys = pgTable('agent_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh').references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  role: text('role').notNull().default('radiologist'),
  scopes: text('scopes').notNull().default('["cases:read","reports:read","reports:draft_write","knowledge:read"]'),
  allowedTools: text('allowed_tools').notNull().default('["*"]'),
  isReadOnly: boolean('is_read_only').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('agent_api_keys_tenant_idx').on(t.tenantId),
  index('agent_api_keys_prefix_idx').on(t.keyPrefix),
]);
