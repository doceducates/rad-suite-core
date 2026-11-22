import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: text('user_name').default(''),
  action: text('action').notNull(), // login | view_patient | view_report | edit_report | sign_report | export_pdf
  entityType: text('entity_type').notNull(), // Patient | Study | Report | User | Auth
  entityId: text('entity_id').default(''),
  details: text('details').default(''),
  ipAddress: text('ip_address').default(''),
  userAgent: text('user_agent').default(''),
  prevHash: text('prev_hash'),
  hash: text('hash'),
  timestamp: text('timestamp').$defaultFn(() => new Date().toISOString()),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_user_idx').on(t.userId),
  index('audit_entity_idx').on(t.entityType, t.entityId),
]);
