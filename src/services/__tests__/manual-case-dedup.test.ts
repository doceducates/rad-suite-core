import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDuplicateManualCase } from '../manual-case-dedup.service';
import { db } from '@/db';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('checkDuplicateManualCase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns exists: false when patient has no existing record', async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const res = await checkDuplicateManualCase('MRN-12345', 'CT', 'CT Brain Plain');
    expect(res.exists).toBe(false);
  });

  it('returns exists: true when patient already has a study with matching modality and description today', async () => {
    const today = new Date();
    // 1st select: patient lookup
    const mockPatient = [{ id: 'p-1', mrNumber: 'MRN-12345', fullName: 'John Doe' }];
    // 2nd select: studies lookup
    const mockStudies = [
      {
        id: 's-1',
        patientId: 'p-1',
        accessionNumber: 'MAN-261007-1111',
        modality: 'CT',
        scanType: 'CT Brain Plain',
        status: 'scheduled',
        scheduledAt: today.toISOString(),
      },
    ];

    let callCount = 0;
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return { limit: vi.fn().mockResolvedValue(mockPatient) };
          }
          return Promise.resolve(mockStudies);
        }),
      }),
    }));

    const res = await checkDuplicateManualCase('MRN-12345', 'CT', 'CT Brain Plain', today);
    expect(res.exists).toBe(true);
    expect(res.existingStudy?.accessionNumber).toBe('MAN-261007-1111');
    expect(res.patientName).toBe('John Doe');
  });

  it('returns exists: false when patient study is for a different modality or scan type', async () => {
    const today = new Date();
    const mockPatient = [{ id: 'p-1', mrNumber: 'MRN-12345', fullName: 'John Doe' }];
    const mockStudies = [
      {
        id: 's-1',
        patientId: 'p-1',
        accessionNumber: 'MAN-261007-1111',
        modality: 'XRAY',
        scanType: 'Chest PA',
        status: 'scheduled',
        scheduledAt: today.toISOString(),
      },
    ];

    let callCount = 0;
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return { limit: vi.fn().mockResolvedValue(mockPatient) };
          }
          return Promise.resolve(mockStudies);
        }),
      }),
    }));

    const res = await checkDuplicateManualCase('MRN-12345', 'CT', 'CT Brain Plain', today);
    expect(res.exists).toBe(false);
  });
});
