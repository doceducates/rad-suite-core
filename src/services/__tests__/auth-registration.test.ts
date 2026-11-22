import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterSchema } from '@/lib/validation';
import { registerUser } from '../auth.service';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';

describe('User Registration & First-User Admin Bootstrap', () => {
  it('should validate valid registration inputs with RegisterSchema', () => {
    const validConsultant = {
      name: 'Dr. Tariq Mahmood',
      email: 'tariq@hospital.org',
      password: 'SecurePassword123',
      role: 'consultant' as const,
    };
    const res1 = RegisterSchema.safeParse(validConsultant);
    expect(res1.success).toBe(true);

    const validPgr = {
      name: 'Dr. Fatima Noor',
      email: 'fatima@hospital.org',
      password: 'SecurePassword123',
      role: 'pgr' as const,
    };
    const res2 = RegisterSchema.safeParse(validPgr);
    expect(res2.success).toBe(true);
  });

  it('should reject invalid email or short password in RegisterSchema', () => {
    const invalidEmail = {
      name: 'Dr. Tariq',
      email: 'invalid-email',
      password: 'SecurePassword123',
    };
    expect(RegisterSchema.safeParse(invalidEmail).success).toBe(false);

    const shortPass = {
      name: 'Dr. Tariq',
      email: 'tariq@hospital.org',
      password: '123',
    };
    expect(RegisterSchema.safeParse(shortPass).success).toBe(false);
  });

  it('should automatically assign admin role to the first user if DB is empty', async () => {
    // Mock db queries to simulate empty database
    const selectMock = vi.spyOn(db, 'select').mockImplementation((() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]), // no existing email
        }),
        limit: () => Promise.resolve([]), // 0 existing users in DB
      }),
    })) as any);

    const insertMock = vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: () => Promise.resolve(),
    })) as any);

    const deleteMock = vi.spyOn(db, 'delete').mockImplementation((() => ({
      where: () => Promise.resolve(),
    })) as any);

    const { user, sessionToken } = await registerUser({
      name: 'Dr. Clinic Founder',
      email: 'founder@clinic.org',
      password: 'Password#2026',
      role: 'consultant', // even if requested as consultant, first user is admin
    });

    expect(user.role).toBe('admin');
    expect(user.title).toBe('System Administrator');
    expect(user.email).toBe('founder@clinic.org');
    expect(sessionToken).toBeDefined();

    selectMock.mockRestore();
    insertMock.mockRestore();
    deleteMock.mockRestore();
  });

  it('should assign consultant and pgr roles properly for subsequent users', async () => {
    // Mock db queries to simulate an already populated database
    const selectMock = vi.spyOn(db, 'select').mockImplementation((() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]), // no duplicate email
        }),
        limit: () => Promise.resolve([{ id: 'existing-admin-id' }]), // already has users!
      }),
    })) as any);

    const insertMock = vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: () => Promise.resolve(),
    })) as any);

    const deleteMock = vi.spyOn(db, 'delete').mockImplementation((() => ({
      where: () => Promise.resolve(),
    })) as any);

    // Register PGR
    const pgrResult = await registerUser({
      name: 'Dr. PGR Trainee',
      email: 'pgr@clinic.org',
      password: 'Password#2026',
      role: 'pgr',
    });
    expect(pgrResult.user.role).toBe('pgr');
    expect(pgrResult.user.title).toBe('Resident Radiologist (PGR)');

    // Register Consultant
    const consResult = await registerUser({
      name: 'Dr. Senior Consultant',
      email: 'consultant@clinic.org',
      password: 'Password#2026',
      role: 'consultant',
    });
    expect(consResult.user.role).toBe('consultant');
    expect(consResult.user.title).toBe('Consultant Radiologist');

    // Attempt to register as admin when DB is already populated should downgrade to consultant
    const forgedAdminResult = await registerUser({
      name: 'Hacker Pretending Admin',
      email: 'hacker@clinic.org',
      password: 'Password#2026',
      role: 'admin',
    });
    expect(forgedAdminResult.user.role).toBe('consultant');

    selectMock.mockRestore();
    insertMock.mockRestore();
    deleteMock.mockRestore();
  });
});
