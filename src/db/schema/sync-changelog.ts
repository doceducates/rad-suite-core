import { pgTable, text, serial, timestamp, index } from 'drizzle-orm/pg-core';

export const syncChangelog = pgTable(
  'sync_changelog',
  {
    id: serial('id').primaryKey(),
    tableName: text('table_name').notNull(), // 'cases' | 'studies' | 'reports' | 'hmis_draft_vault' | 'hospital_pacs_studies' | 'patients'
    entityId: text('entity_id').notNull(), // Accession number, MRN, or UUID
    operation: text('operation').notNull(), // 'INSERT' | 'UPDATE' | 'DELETE'
    dataJson: text('data_json'), // Optional payload delta or summary snapshot
    actorId: text('actor_id').default('system'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_sync_changelog_table_entity').on(t.tableName, t.entityId),
    index('idx_sync_changelog_changed_at').on(t.changedAt),
  ]
);

export type SyncChangelogRow = typeof syncChangelog.$inferSelect;
export type NewSyncChangelogRow = typeof syncChangelog.$inferInsert;
