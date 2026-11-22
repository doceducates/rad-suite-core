import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteCaseFromIndex, restoreCaseToIndex, getTombstonedAccessions } from '../case-deletion.service';
import { db, sqlite } from '@/db';

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
  },
  sqlite: {
    prepare: vi.fn().mockImplementation(() => ({
      run: vi.fn(),
      get: vi.fn(),
    })),
  },
}));

describe('Case Deletion & Tombstone Service', () => {
  const mockUser = { id: 'u-1', name: 'Dr. Radiologist' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error if accession number is empty', async () => {
    await expect(deleteCaseFromIndex('', mockUser)).rejects.toThrow('Accession number is required for deletion.');
  });

  it('deletes study, reports, and records tombstone for existing case', async () => {
    const mockStudy = [{ id: 's-1', accessionNumber: '192610001052', patientId: 'p-1' }];
    const mockReports = [{ id: 'r-1', studyId: 's-1' }];

    let selectCall = 0;
    (db.select as any).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCall++;
          if (selectCall === 1) {
            return { limit: vi.fn().mockResolvedValue(mockStudy) };
          }
          if (selectCall === 2) {
            return Promise.resolve(mockReports);
          }
          // Check remaining studies for patient
          return { limit: vi.fn().mockResolvedValue([]) };
        }),
      }),
    }));

    const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
    (db.delete as any).mockReturnValue({
      where: mockDeleteWhere,
    });

    const result = await deleteCaseFromIndex('192610001052', mockUser, 'Test delete');
    expect(result.success).toBe(true);
    expect(result.accessionNumber).toBe('192610001052');
    expect(sqlite.prepare).toHaveBeenCalled();
  });

  it('restores tombstoned case successfully', async () => {
    const res = await restoreCaseToIndex('192610001052', mockUser);
    expect(res.success).toBe(true);
    expect(res.accessionNumber).toBe('192610001052');
  });
});
