import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enqueueHmisBatchRevert } from '../hmis-batch-revert.service';
import { dispatchHmisRevert } from '../hmis-report-dispatch.service';
import { db } from '@/db';
import { studies, hmisDraftVault, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notify } from '@/services/notification.service';
import type { PacsStudyResult } from '@/types/pacs';

describe('HMIS Batch Revert Service & Reset Pipeline', () => {
  const testAcc1 = 'TEST-REVERT-ACC-001';
  const testAcc2 = 'TEST-REVERT-ACC-002';
  const testMrn1 = 'TEST-MRN-REVERT-001';
  const testMrn2 = 'TEST-MRN-REVERT-002';

  const testPatientId = 'pat-revert-001';

  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc1));
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc2));
    await db.delete(patients).where(eq(patients.id, testPatientId));
    await db.delete(hmisDraftVault).where(eq(hmisDraftVault.patientMrn, testMrn1));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc1));
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc2));
    await db.delete(patients).where(eq(patients.id, testPatientId));
    await db.delete(hmisDraftVault).where(eq(hmisDraftVault.patientMrn, testMrn1));
  });

  it('updates local study hmisStatus to awaiting_report and vault to reverted on successful dispatchHmisRevert', async () => {
    // Seed patient for foreign key integrity
    await db.insert(patients).values({
      id: testPatientId,
      mrNumber: testMrn1,
      fullName: 'Test Revert Patient',
      dob: '1985-05-05',
      age: 40,
      gender: 'Female',
    }).onConflictDoNothing();

    // Seed initial study with hmisStatus: 'draft'
    await db.insert(studies).values({
      id: 'test-study-revert-001',
      accessionNumber: testAcc1,
      patientId: testPatientId,
      scanType: 'MRI Brain',
      bodyPart: 'Brain',
      modality: 'MRI',
      priority: 'routine',
      status: 'preliminary',
      hmisStatus: 'draft',
    });

    // Seed draft in vault
    await db.insert(hmisDraftVault).values({
      id: 'vault-revert-001',
      accession: testAcc1,
      patientMrn: testMrn1,
      moduleId: '792',
      status: 'draft_saved',
      createdAt: new Date(),
    });

    // Mock fetch for gateway /api/radiology/revert
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          status: 'REVERTED',
          accession: testAcc1,
          auditScreenshot: 'proof.png',
          revertedAt: new Date().toISOString(),
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await dispatchHmisRevert({
      mrn: testMrn1,
      accession: testAcc1,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('REVERTED');

    // Verify study hmisStatus in database was reset to awaiting_report
    const [updatedStudy] = await db
      .select({ hmisStatus: studies.hmisStatus })
      .from(studies)
      .where(eq(studies.accessionNumber, testAcc1));
    expect(updatedStudy?.hmisStatus).toBe('awaiting_report');

    // Verify vault status was marked as reverted
    const [updatedVault] = await db
      .select({ status: hmisDraftVault.status })
      .from(hmisDraftVault)
      .where(eq(hmisDraftVault.accession, testAcc1));
    expect(updatedVault?.status).toBe('reverted');
  });

  it('batch reverts selected cases sequentially with progress notification', async () => {
    const progressSpy = vi.spyOn(notify, 'progress');
    const updateProgressSpy = vi.spyOn(notify, 'updateProgress');
    const successSpy = vi.spyOn(notify, 'success');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: 'REVERTED' } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const mockCases: PacsStudyResult[] = [
      {
        id: 'c1',
        accessionNumber: testAcc1,
        patientMrn: testMrn1,
        patientName: 'Ayesha Usman',
        studyDescription: 'MRI LS Spine',
        modality: 'MRI',
        status: 'draft',
      } as any,
      {
        id: 'c2',
        accessionNumber: testAcc2,
        patientMrn: testMrn2,
        patientName: 'Azra BB',
        studyDescription: 'MRI LS Spine',
        modality: 'MRI',
        status: 'draft',
      } as any,
    ];

    const onCompleteMock = vi.fn();

    await enqueueHmisBatchRevert(mockCases, {
      onComplete: onCompleteMock,
    });

    expect(progressSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'HMIS Revert to Default',
        total: 2,
        items: expect.arrayContaining([
          expect.objectContaining({ id: testAcc1, label: 'Ayesha Usman' }),
          expect.objectContaining({ id: testAcc2, label: 'Azra BB' }),
        ]),
      })
    );

    // Verify fetch was called for both cases to /api/hmis/revert
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ accessionNumber: testAcc1, patientMrn: testMrn1 })
    );
    expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual(
      expect.objectContaining({ accessionNumber: testAcc2, patientMrn: testMrn2 })
    );

    expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('Successfully reverted 2 case(s)'));
    expect(onCompleteMock).toHaveBeenCalledTimes(1);
  });
});
