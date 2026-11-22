import { describe, it, expect } from 'vitest';
import { tenantService, DEFAULT_TENANT_ID } from '../tenant.service';
import { createId, parseIdPrefix } from '@/lib/id';

describe('Multi-Tenant & Type-Prefixed ID Architecture', () => {
  it('generates chronological, collision-safe, type-prefixed identifiers', () => {
    const tntId = createId('tnt');
    const usrId = createId('usr');
    const stdId = createId('std');
    const repId = createId('rep');

    expect(tntId).toMatch(/^tnt_[a-z0-9]+/);
    expect(usrId).toMatch(/^usr_[a-z0-9]+/);
    expect(stdId).toMatch(/^std_[a-z0-9]+/);
    expect(repId).toMatch(/^rep_[a-z0-9]+/);

    expect(parseIdPrefix(tntId)).toBe('tnt');
    expect(parseIdPrefix(usrId)).toBe('usr');
    expect(parseIdPrefix(stdId)).toBe('std');
    expect(parseIdPrefix(repId)).toBe('rep');
  });

  it('retrieves default tenant tnt_lgh from the database', async () => {
    const tenant = await tenantService.getTenant(DEFAULT_TENANT_ID);
    expect(tenant).not.toBeNull();
    expect(tenant?.id).toBe(DEFAULT_TENANT_ID);
    expect(tenant?.code).toBe('LGH');
    expect(tenant?.name).toBe('Lahore General Hospital');
  });

  it('retrieves tenant by uppercase code', async () => {
    const tenant = await tenantService.getTenant('LGH');
    expect(tenant).not.toBeNull();
    expect(tenant?.id).toBe(DEFAULT_TENANT_ID);
  });

  it('lists active hospital tenants', async () => {
    const list = await tenantService.listActiveTenants();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(t => t.id === DEFAULT_TENANT_ID)).toBe(true);
  });
});
