import { describe, it, expect } from 'vitest';
import { getUserHmisCredentials } from '@/services/auth.service';

describe('HMIS API User Credentials Forwarding', () => {
  it('should provide credentials with password for gateway dispatch', async () => {
    const creds = await getUserHmisCredentials();
    expect(creds).toHaveProperty('hospitalId');
    expect(creds).toHaveProperty('username');
    expect(creds).toHaveProperty('password');
  });
});
