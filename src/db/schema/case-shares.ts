import { pgTable, text, timestamp, boolean, integer, uuid, index } from 'drizzle-orm/pg-core';
import { studies } from './studies';
import { users } from './users';

export const caseShares = pgTable(
  'case_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studyId: uuid('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    passwordHint: text('password_hint'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    durationHours: integer('duration_hours').notNull().default(72),
    maxViews: integer('max_views'),
    viewCount: integer('view_count').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_case_shares_token').on(t.token),
    index('idx_case_shares_study_id').on(t.studyId),
  ]
);

export type CaseShare = typeof caseShares.$inferSelect;
export type NewCaseShare = typeof caseShares.$inferInsert;
