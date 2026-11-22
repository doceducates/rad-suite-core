import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchHmisDraft } from '../hmis-report-dispatch.service';
import { WorklistQuickHmisButton } from '@/components/worklist/worklist-quick-hmis-button';
import { MyCasesBatchHmisModal } from '@/components/my-cases/my-cases-batch-hmis-modal';
import { db } from '@/db';
import { studies, hmisDraftVault } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('HMIS Quick Draft & Batch Draft Dispatch Architecture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports WorklistQuickHmisButton and MyCasesBatchHmisModal as valid React components', () => {
    expect(typeof WorklistQuickHmisButton).toBe('function');
    expect(typeof MyCasesBatchHmisModal).toBe('function');
  });

  it('dispatches draft with complete clinical metadata and updates study and vault status', async () => {
    const testAcc = `HMIS-QUICK-${Date.now()}`;
    const testMrn = `MRN-${Date.now()}`;
    const patientId = crypto.randomUUID();

    // Insert patient first to satisfy foreign key constraint
    const { patients } = await import('@/db/schema');
    await db.insert(patients).values({
      id: patientId,
      mrNumber: testMrn,
      fullName: 'Quick Draft Test Patient',
      age: 40,
      gender: 'Male',
      createdAt: new Date(),
    } as any);

    // Insert dummy study in isolated test database
    await db.insert(studies).values({
      id: crypto.randomUUID(),
      accessionNumber: testAcc,
      patientId,
      modality: 'MRI',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'LS Spine',
      status: 'scheduled',
      scheduledAt: new Date(),
    } as any);

    // Mock fetch for gateway
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          status: 'DRAFT_SAVED',
          verified: true,
          auditScreenshot: 'test-screenshot.png',
        },
      }),
    });

    const result = await dispatchHmisDraft({
      mrn: testMrn,
      accession: testAcc,
      modality: 'MRI',
      scanType: 'MRI Lumbar Spine',
      bodyPart: 'LS Spine',
      cpt: 'MRI Lumbar Spine',
      investigationId: '123456',
      technique: 'MRI of lumbar spine.',
      findings: 'L4-L5 disc protrusion.',
      impression: 'Moderate canal stenosis.',
      clinicalHistory: 'Low back pain',
      pgrName: 'Dr. Jane Doe (Resident Radiologist)',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('DRAFT_SAVED');
    expect(result.verified).toBe(true);

    // Verify studies table was updated with hmisStatus: 'draft'
    const [updatedStudy] = await db
      .select()
      .from(studies)
      .where(eq(studies.accessionNumber, testAcc));
    expect(updatedStudy).toBeDefined();
    expect(updatedStudy.hmisStatus).toBe('draft');

    // Verify hmisDraftVault record exists and was updated to saved_draft
    const [vaultRecord] = await db
      .select()
      .from(hmisDraftVault)
      .where(eq(hmisDraftVault.accession, testAcc));
    expect(vaultRecord).toBeDefined();
    expect(vaultRecord.status).toBe('saved_draft');
    expect(vaultRecord.findings).toBe('L4-L5 disc protrusion.');
  });
});
