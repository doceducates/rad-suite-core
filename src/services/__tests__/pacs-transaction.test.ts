import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { importStudyToWorklist } from '../pacs.service';
import type { PacsStudyResult } from '@/types/pacs';

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('PACS Transactional Writes & Accession Collision (P1 #13)', () => {
  const sampleStudy: PacsStudyResult = {
    studyInstanceUid: '1.2.3.4.5',
    accessionNumber: 'ACC-2026-999',
    patientName: 'Zainab Bibi',
    patientMrn: '19202521012202',
    age: 45,
    gender: 'Female',
    modality: 'CT',
    studyDescription: 'CT Brain Plain',
    studyDate: '2026-09-19',
    numSeries: 1,
    numInstances: 50,
    pacsServerAe: 'HMIS_PACS',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes atomic transactional writes with patient, study, and report in single tx', async () => {
    const mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn()
        // 1st limit: resolvePatientByMrn -> none found
        .mockResolvedValueOnce([])
        // 2nd limit: studies lookup -> none found
        .mockResolvedValueOnce([])
        // 3rd limit: reports lookup -> none found
        .mockResolvedValueOnce([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    const transactionSpy = vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    const result = await importStudyToWorklist(sampleStudy, 'user-1', 'Dr. Radiologist');

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.accessionNumber).toBe('ACC-2026-999');
    // Patient + Study + Report inserts
    expect(mockTx.insert).toHaveBeenCalledTimes(3);
  });

  it('handles idempotent re-import of same accession for same patient without duplicate insert', async () => {
    const existingPatientId = 'patient-uuid-1';
    const existingStudyId = 'study-uuid-1';

    const mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn()
        // 1. resolvePatientByMrn -> patient found
        .mockResolvedValueOnce([{ id: existingPatientId, mrNumber: '19202521012202' }])
        // 2. studies lookup -> existing study for same patient
        .mockResolvedValueOnce([{ id: existingStudyId, patientId: existingPatientId, accessionNumber: 'ACC-2026-999' }])
        // 3. reports lookup -> existing report found
        .mockResolvedValueOnce([{ id: 'report-1', studyId: existingStudyId }]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    const result = await importStudyToWorklist(sampleStudy);

    expect(result.success).toBe(true);
    expect(result.studyId).toBe(existingStudyId);
    expect(result.accessionNumber).toBe('ACC-2026-999');
    // In idempotent re-import, no new study or patient is inserted
    expect(mockTx.insert).not.toHaveBeenCalled();
  });

  it('resolves accession collision across different patients by disambiguating accession number', async () => {
    const newPatientId = 'patient-uuid-2';
    const differentPatientId = 'patient-uuid-1';

    const mockTx = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn()
        // 1. resolvePatientByMrn -> resolved as new patient
        .mockResolvedValueOnce([{ id: newPatientId, mrNumber: '19202521012202' }])
        // 2. studies lookup -> found study belonging to a DIFFERENT patient (collision!)
        .mockResolvedValueOnce([{ id: 'collision-study-id', patientId: differentPatientId, accessionNumber: 'ACC-2026-999' }])
        // 3. reports lookup -> none for new study
        .mockResolvedValueOnce([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };

    vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    const result = await importStudyToWorklist(sampleStudy);

    expect(result.success).toBe(true);
    // Accession must be disambiguated with -DUP suffix to prevent unique constraint crash
    expect(result.accessionNumber).toMatch(/^ACC-2026-999-DUP[A-F0-9]{4}$/);
    expect(mockTx.insert).toHaveBeenCalledTimes(2); // study + report inserts
  });

  it('supports async callbacks in db.transaction without throwing', async () => {
    const res = await db.transaction(async (tx) => {
      await new Promise((r) => setTimeout(r, 5));
      return 'transaction_ok';
    });
    expect(res).toBe('transaction_ok');
  });
});
