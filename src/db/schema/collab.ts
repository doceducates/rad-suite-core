import { pgTable, text, timestamp, customType } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const collabDocs = pgTable('collab_docs', {
  reportId: text('report_id').primaryKey(),
  ydocState: bytea('ydoc_state').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
