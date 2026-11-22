/**
 * Multi-Tenant Management Service
 * Layer 2 (Domain/Services) — Standard Stripe/Linear Tenant Scoping (<150 lines)
 */

import { db, IS_SQLITE } from '@/db';
import { tenants } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { createId } from '@/lib/id';

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  subdomain?: string | null;
  status: string;
  settingsJson?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const DEFAULT_TENANT_ID = 'tnt_lgh';

export const tenantService = {
  /**
   * Retrieves a tenant by ID, code, or subdomain.
   */
  async getTenant(identifier: string = DEFAULT_TENANT_ID): Promise<TenantRecord | null> {
    try {
      const rows = await db
        .select()
        .from(tenants)
        .where(
          or(
            eq(tenants.id, identifier),
            eq(tenants.code, identifier.toUpperCase()),
            eq(tenants.subdomain, identifier.toLowerCase())
          )
        )
        .limit(1);

      if (!rows || rows.length === 0) return null;
      return rows[0] as TenantRecord;
    } catch (err) {
      console.warn('[TENANT_GET_WARN] Could not retrieve tenant:', err);
      return null;
    }
  },

  /**
   * Retrieves all active hospital tenants in the workstation.
   */
  async listActiveTenants(): Promise<TenantRecord[]> {
    try {
      const rows = await db
        .select()
        .from(tenants)
        .where(eq(tenants.status, 'active'));

      return (rows || []) as TenantRecord[];
    } catch (err) {
      console.warn('[TENANT_LIST_WARN] Could not list tenants:', err);
      return [];
    }
  },

  /**
   * Registers a new tenant with type-prefixed identifier 'tnt_...'.
   */
  async registerTenant(input: {
    name: string;
    code: string;
    subdomain?: string;
    settings?: Record<string, any>;
  }): Promise<TenantRecord> {
    const tenantId = createId('tnt');
    const now = new Date();

    const newRecord = {
      id: tenantId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      subdomain: input.subdomain?.trim().toLowerCase() || null,
      status: 'active',
      settingsJson: JSON.stringify(input.settings || {}),
      createdAt: IS_SQLITE ? now.toISOString() : (now as any),
      updatedAt: IS_SQLITE ? now.toISOString() : (now as any),
    };

    await db.insert(tenants).values(newRecord as any);
    return newRecord as TenantRecord;
  },
};
