import { pgTable, text, timestamp, integer, uuid, index } from 'drizzle-orm/pg-core';
import { reports } from './reports';

export const reportSyncOutbox = pgTable('report_sync_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  accessionNumber: text('accession_number').notNull(),
  providerId: text('provider_id').notNull(), // 'sqlite' | 'postgres' | 's3' | 'gdocs'
  status: text('status').notNull().default('pending'), // 'pending' | 'synced' | 'failed' | 'skipped'
  targetRef: text('target_ref'), // S3 Key, remote DB ID, or Google Doc URL
  errorMessage: text('error_message'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('report_sync_outbox_report_idx').on(t.reportId),
  index('report_sync_outbox_provider_idx').on(t.providerId),
  index('report_sync_outbox_status_idx').on(t.status),
  index('report_sync_outbox_accession_idx').on(t.accessionNumber),
]);
