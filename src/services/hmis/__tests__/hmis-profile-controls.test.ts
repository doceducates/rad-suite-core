import { describe, it, expect } from 'vitest';
import { getUserHmisCredentials, getCurrentUser } from '@/services/auth.service';

describe('HMIS Profile Dropdown & Worklist Quick Launch Contract', () => {
  it('should retrieve stored credentials for active user fallback', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();

    const creds = await getUserHmisCredentials(user?.id);
    expect(creds).toBeDefined();
    expect(typeof creds.hospitalId).toBe('string');
    expect(typeof creds.username).toBe('string');
  });

  it('should handle undefined user ID gracefully without throwing', async () => {
    const creds = await getUserHmisCredentials(undefined);
    expect(creds).toBeDefined();
    expect(typeof creds.hospitalId).toBe('string');
    expect(typeof creds.username).toBe('string');
  });
});
