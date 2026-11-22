import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const clientWorkstations = pgTable(
  'client_workstations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    machineId: text('machine_id').notNull().unique(),
    hostname: text('hostname').default(''),
    platform: text('platform').notNull().default('windows'),
    osVersion: text('os_version').default(''),
    appVersion: text('app_version').notNull().default('1.0.0'),
    lastUserId: uuid('last_user_id').references(() => users.id, { onDelete: 'set null' }),
    lastUserName: text('last_user_name').default(''),
    ipAddress: text('ip_address').default(''),
    status: text('status').notNull().default('online'),
    metadata: text('metadata').default('{}'), // JSON specs e.g. { cpuCores, gpuAccelerated }
    installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('workstation_machine_idx').on(t.machineId),
    index('workstation_last_seen_idx').on(t.lastSeenAt),
  ]
);
