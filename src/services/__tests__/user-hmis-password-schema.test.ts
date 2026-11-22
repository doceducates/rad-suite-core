import { describe, it, expect } from 'vitest';
import { db, IS_SQLITE } from '@/db';
import { users } from '@/db/schema';

describe('User HMIS Password Schema Parity', () => {
  it('should include hmisPassword column in users schema definition', () => {
    expect(users.hmisPassword).toBeDefined();
    expect(users.hmisPassword.name).toBe('hmis_password');
  });

  it('should ensure hmis_password column exists in database table without breaking passwordHash', async () => {
    if (IS_SQLITE) {
      const sqlite = (db as any).session?.client;
      if (sqlite) {
        const cols = sqlite.prepare("PRAGMA table_info(users)").all().map((c: any) => c.name);
        expect(cols).toContain('hmis_password');
        expect(cols).toContain('password_hash');
        expect(cols).toContain('hmis_hospital_id');
        expect(cols).toContain('hmis_username');
      }
    }
  });
});
