import { pgTable, text, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pacsServers = pgTable('pacs_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  name: text('name').notNull(),
  aeTitle: text('ae_title').notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  callingAeTitle: text('calling_ae_title').notNull().default('RADIANT'),
  listenerPort: integer('listener_port').notNull().default(11112),
  retrieveProtocol: text('retrieve_protocol').notNull().default('C-GET'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  description: text('description').default(''),
  lastPingStatus: text('last_ping_status').default('unknown'),
  lastPingAt: timestamp('last_ping_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
