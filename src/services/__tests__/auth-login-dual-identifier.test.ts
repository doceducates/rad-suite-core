import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { verifyPassword, getCurrentUser, updateUserProfile } from '@/services/auth.service';

describe('Dual-Identifier Authentication & Case Sensitivity Invariant', () => {
  let initialProfile: any = null;

  beforeAll(async () => {
    const user = await getCurrentUser();
    if (user) {
      initialProfile = {
        name: user.name,
        hmisUsername: user.hmisUsername,
        hmisHospitalId: user.hmisHospitalId,
      };
      await updateUserProfile(user.id, {
        name: 'Dr. Jane Doe',
        hmisUsername: 'Dr.JaneDoe',
      });
    }
  });

  afterAll(async () => {
    const user = await getCurrentUser();
    if (user && initialProfile) {
      await updateUserProfile(user.id, initialProfile);
    }
  });

  it('authenticates user by exact institutional email', async () => {
    const current = await getCurrentUser();
    expect(current).toBeDefined();
    const adminEmail = current!.email;

    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(sql`lower(${users.email})`, adminEmail.toLowerCase()),
          eq(sql`lower(${users.hmisUsername})`, adminEmail.toLowerCase())
        )
      )
      .limit(1);

    expect(user).toBeDefined();
    expect(user.email).toBe(adminEmail);
    expect(user.role).toBe('admin');

    const seedPass = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345!';
    const isValid = await verifyPassword(seedPass, user.passwordHash);
    expect(isValid).toBe(true);
  });

  it('authenticates user by HMIS portal username in exact casing', async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(sql`lower(${users.email})`, 'Dr.JaneDoe'.toLowerCase()),
          eq(sql`lower(${users.hmisUsername})`, 'Dr.JaneDoe'.toLowerCase())
        )
      )
      .limit(1);

    expect(user).toBeDefined();
    expect(user.name).toBe('Dr. Jane Doe');
    expect(user.hmisUsername).toBe('Dr.JaneDoe');

    const seedPass = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@12345!';
    const isValid = await verifyPassword(seedPass, user.passwordHash);
    expect(isValid).toBe(true);
  });

  it('authenticates user by HMIS portal username in lowercase input', async () => {
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(sql`lower(${users.email})`, 'dr.janedoe'.toLowerCase()),
          eq(sql`lower(${users.hmisUsername})`, 'dr.janedoe'.toLowerCase())
        )
      )
      .limit(1);

    expect(user).toBeDefined();
    expect(user.hmisUsername).toBe('Dr.JaneDoe');
  });

  it('preserves exact casing of Dr.JaneDoe and clinician name when updating profile', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();

    const updated = await updateUserProfile(user!.id, {
      name: 'Dr. Jane Doe',
      hmisUsername: 'Dr.JaneDoe',
    });

    expect(updated.name).toBe('Dr. Jane Doe');
    expect(updated.hmisUsername).toBe('Dr.JaneDoe');
    expect(updated.hmisUsername).not.toBe('dr.janedoe');
  });
});
