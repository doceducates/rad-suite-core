import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { updateUserProfile, getUserHmisCredentials, getCurrentUser } from '@/services/auth.service';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('HMIS Password AES-256-GCM Isolation & Security', () => {
  let initialProfile: any = null;

  beforeAll(async () => {
    const user = await getCurrentUser();
    if (user) {
      const creds = await getUserHmisCredentials(user.id);
      initialProfile = {
        name: user.name,
        title: user.title,
        licenseNo: user.licenseNo,
        department: user.department,
        hmisHospitalId: user.hmisHospitalId,
        hmisUsername: user.hmisUsername,
        hmisPassword: creds.password,
      };
    }
  });

  afterAll(async () => {
    const user = await getCurrentUser();
    if (user && initialProfile) {
      await updateUserProfile(user.id, initialProfile);
    }
  });

  it('should encrypt HMIS password at rest and never store in plaintext', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();

    const plainHmisPassword = 'SampleSecret123!';
    await updateUserProfile(user!.id, { hmisPassword: plainHmisPassword });

    // Inspect direct database row
    const [row] = await db.select().from(users).where(eq(users.id, user!.id as any)).limit(1);
    expect((row as any).hmisPassword).toBeDefined();
    expect((row as any).hmisPassword).not.toBe(plainHmisPassword);
    expect((row as any).hmisPassword).toMatch(/^enc:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
  });

  it('should mask hmisPassword in getCurrentUser() and expose only hasHmisPassword boolean', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();
    expect((user as any).hmisPassword).toBeUndefined();
    expect(user!.hasHmisPassword).toBe(true);
  });

  it('should decrypt HMIS credentials accurately via getUserHmisCredentials() for internal gateway calls', async () => {
    const user = await getCurrentUser();
    const creds = await getUserHmisCredentials(user!.id);
    expect(creds.password).toBe('SampleSecret123!');
  });

  it('should not overwrite hmisPassword when updating other profile fields with empty password', async () => {
    const user = await getCurrentUser();
    await updateUserProfile(user!.id, { title: 'Senior Consultant Radiologist' });
    const creds = await getUserHmisCredentials(user!.id);
    expect(creds.password).toBe('SampleSecret123!');
  });
});

