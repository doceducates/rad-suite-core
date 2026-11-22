import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterSchema, CreateUserSchema, BatchUserActionSchema } from '@/lib/validation';
import { saveReport } from '../report.service';
import { db } from '@/db';

function createMockQueryChain(resolveData: any[] = []) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(resolveData)),
    then: (resolve: any, reject: any) => Promise.resolve(resolveData).then(resolve, reject),
  };
  return chain;
}

describe('Auth Validation & Admin User Schemas', () => {
  it('validates correct registration payloads and rejects short passwords', () => {
    const valid = {
      name: 'Dr. Tariq',
      email: 'tariq@hospital.org',
      password: 'password123',
      role: 'consultant',
    };
    expect(RegisterSchema.safeParse(valid).success).toBe(true);

    const invalidPassword = {
      ...valid,
      password: '123',
    };
    const res = RegisterSchema.safeParse(invalidPassword);
    expect(res.success).toBe(false);
  });

  it('validates admin manual user creation schema', () => {
    const validUser = {
      name: 'Dr. Sarah Resident',
      email: 'sarah@hospital.org',
      password: 'securePassword!',
      role: 'pgr',
      status: 'active',
      allowedScreens: ['my_cases', 'workstation'],
    };
    expect(CreateUserSchema.safeParse(validUser).success).toBe(true);
  });

  it('validates batch user actions schema', () => {
    const validBatch = {
      userIds: ['usr-1', 'usr-2'],
      action: 'activate',
    };
    expect(BatchUserActionSchema.safeParse(validBatch).success).toBe(true);

    const emptyBatch = {
      userIds: [],
      action: 'delete',
    };
    expect(BatchUserActionSchema.safeParse(emptyBatch).success).toBe(false);
  });
});

describe('Multi-Doctor Case Concurrency & Observation Mode Guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deactivates auto-save on unassigned studies in observation mode', async () => {
    const studyId = 'study-unassigned-12345';
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        {
          id: studyId,
          accessionNumber: 'ACC-UNASSIGNED',
          assignedRadiologistId: null, // Unassigned!
          patientId: 'pat-1',
        },
      ])
    );

    const result = await saveReport(
      {
        studyId,
        accessionNumber: 'ACC-UNASSIGNED',
        findings: '<p>Observed findings</p>',
        isAutoSave: true, // Auto-save from workstation
      },
      { id: 'doc-user-1', name: 'Dr. Bilawal', role: 'radiologist' }
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('auto-save disabled in observation mode');
  });

  it('deactivates auto-save when study is claimed by another radiologist', async () => {
    const studyId = 'study-claimed-12345';
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        {
          id: studyId,
          accessionNumber: 'ACC-CLAIMED',
          assignedRadiologistId: 'doctor-a-id', // Claimed by Doctor A
          patientId: 'pat-1',
        },
      ])
    );

    const result = await saveReport(
      {
        studyId,
        accessionNumber: 'ACC-CLAIMED',
        findings: '<p>Doctor B typing</p>',
        isAutoSave: true,
      },
      { id: 'doctor-b-id', name: 'Dr. Babar', role: 'radiologist' }
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Case claimed by another doctor');
  });

  it('rejects explicit manual save when study is claimed by another radiologist', async () => {
    const studyId = 'study-claimed-99999';
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        {
          id: studyId,
          accessionNumber: 'ACC-CLAIMED-99',
          assignedRadiologistId: 'doctor-a-id',
          patientId: 'pat-1',
        },
      ])
    );

    await expect(
      saveReport(
        {
          studyId,
          accessionNumber: 'ACC-CLAIMED-99',
          findings: '<p>Trying to overwrite Doctor A report</p>',
          isAutoSave: false, // Explicit save
        },
        { id: 'doctor-b-id', name: 'Dr. Babar', role: 'radiologist' }
      )
    ).rejects.toThrow('Case lock: You cannot edit a report claimed by another radiologist.');
  });
});
