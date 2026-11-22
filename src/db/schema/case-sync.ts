import { pgTable, text, timestamp, integer, uuid, index } from 'drizzle-orm/pg-core';

export const caseSyncOutbox = pgTable(
  'case_sync_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull().default('case_bundle'), // 'case_bundle' | 'patient' | 'study' | 'report' | 'tombstone'
    entityId: text('entity_id').notNull(), // Accession number or MRN
    action: text('action').notNull().default('upsert'), // 'upsert' | 'delete'
    payloadJson: text('payload_json').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict'
    retryCount: integer('retry_count').notNull().default(0),
    errorMessage: text('error_message'),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('case_sync_outbox_status_idx').on(t.status),
    index('case_sync_outbox_entity_idx').on(t.entityType, t.entityId),
    index('case_sync_outbox_created_idx').on(t.createdAt),
  ]
);

export type CaseSyncOutboxRow = typeof caseSyncOutbox.$inferSelect;
export type NewCaseSyncOutboxRow = typeof caseSyncOutbox.$inferInsert;
