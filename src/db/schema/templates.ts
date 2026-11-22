import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  modality: text('modality').notNull(),
  study: text('study').notNull(),
  technique: text('technique').default(''),
  findings: text('findings').default(''),
  impression: text('impression').default(''),
  recommendation: text('recommendation').default(''),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
