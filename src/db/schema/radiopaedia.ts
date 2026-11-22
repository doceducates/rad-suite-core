import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core';

export const radiopaediaAccounts = pgTable('radiopaedia_accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  requestsToday: integer('requests_today').default(0),
  rateLimitResetAt: integer('rate_limit_reset_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type RadiopaediaAccount = typeof radiopaediaAccounts.$inferSelect;
export type NewRadiopaediaAccount = typeof radiopaediaAccounts.$inferInsert;

export interface RadiopaediaAccountSummary {
  id: string;
  name: string;
  maskedClientId: string;
  hasToken: boolean;
  isExpired: boolean;
  isActive: boolean;
  requestsToday: number;
  createdAt: string;
}

export interface ConnectAccountInput {
  name: string;
  clientId: string;
  clientSecret: string;
  authCode: string;
}
