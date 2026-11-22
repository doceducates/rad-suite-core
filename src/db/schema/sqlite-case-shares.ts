import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sqliteCaseShares = sqliteTable('case_shares', {
  id: text('id').primaryKey(),
  studyId: text('study_id').notNull(),
  token: text('token').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordHint: text('password_hint'),
  expiresAt: text('expires_at').notNull(),
  durationHours: integer('duration_hours').notNull().default(72),
  maxViews: integer('max_views'),
  viewCount: integer('view_count').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
