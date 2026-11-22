import { describe, it, expect, beforeEach } from 'vitest';
import { registerUser, verifySession, createSession } from '../auth.service';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Central Authority & Governance Invariant (Section 8/23)', () => {
  const masterEmail = 'mudassir@radsuite.pk';
  const clientEmail = `resident_${Date.now()}@hospital.pk`;

  beforeEach(async () => {
    // Clean test accounts if exist
    await db.delete(users).where(eq(users.email, masterEmail));
    await db.delete(users).where(eq(users.email, clientEmail));
  });

  it('assigns role: admin and status: active when Dr. Mudassir registers', async () => {
    const res = await registerUser({
      name: 'Dr. Muhammad Mudassir',
      email: masterEmail,
      password: 'StrongPassword123!',
      title: 'Consultant Radiologist',
    });

    expect(res.user.role).toBe('admin');
    expect(res.user.status).toBe('active');
    expect(res.user.allowedScreens).toEqual(['*']);
  });

  it('assigns role: consultant and status: waitlisted for regular client registration without invite', async () => {
    const res = await registerUser({
      name: 'Dr. Client User',
      email: clientEmail,
      password: 'StrongPassword123!',
      title: 'Resident Radiologist',
    });

    expect(res.user.role).not.toBe('admin');
    expect(res.user.status).toBe('waitlisted');
  });

  it('immediately blocks session verification when an account is disabled (kill-switch)', async () => {
    // Create a user and session
    const res = await registerUser({
      name: 'Revoked User',
      email: `revoked_${Date.now()}@hospital.pk`,
      password: 'StrongPassword123!',
    });

    const token = await createSession(res.user.id);
    const activeCheck = await verifySession(token);
    expect(activeCheck).not.toBeNull();
    expect(activeCheck?.user.id).toBe(res.user.id);

    // Disable the account (as if Dr. Mudassir toggled it in central dashboard)
    await db.update(users).set({ status: 'disabled' }).where(eq(users.id, res.user.id as any));

    // Verify session must now return null immediately
    const disabledCheck = await verifySession(token);
    expect(disabledCheck).toBeNull();
  });
});
