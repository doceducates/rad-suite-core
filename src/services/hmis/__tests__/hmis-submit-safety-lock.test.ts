import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@/db';
import { hmisDraftVault, studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { dispatchHmisSubmit } from '../hmis-report-dispatch.service';
import { config } from '@/lib/config';

describe('HMIS Submit Safety Lock & Pipeline Verification', () => {
  const testAcc = 'TEST-SUBMIT-ACC-001';
  const testMrn = 'TEST-MRN-SUBMIT-999';

  beforeEach(async () => {
    vi.restoreAllMocks();
    // Clean up any test records in isolated test SQLite db
    await db.delete(hmisDraftVault).where(eq(hmisDraftVault.patientMrn, testMrn));
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete(hmisDraftVault).where(eq(hmisDraftVault.patientMrn, testMrn));
    await db.delete(studies).where(eq(studies.accessionNumber, testAcc));
  });

  it('strictly rejects final submit when config.hmisAllowFinalSubmit is false', async () => {
    vi.spyOn(config, 'hmisAllowFinalSubmit', 'get').mockReturnValue(false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await dispatchHmisSubmit({
      mrn: testMrn,
      accession: testAcc,
      findings: 'Lungs are clear bilaterally.',
      impression: 'No acute cardiopulmonary disease.',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('locked by clinical safety policy');
    expect(fetchSpy).not.toHaveBeenCalled();

    // Verify nothing was written to the draft vault
    const vaultRecords = await db
      .select()
      .from(hmisDraftVault)
      .where(eq(hmisDraftVault.patientMrn, testMrn));
    expect(vaultRecords.length).toBe(0);
  });

  it('rejects submission if patient MRN is missing even when unlocked', async () => {
    vi.spyOn(config, 'hmisAllowFinalSubmit', 'get').mockReturnValue(true);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await dispatchHmisSubmit({
      mrn: '',
      accession: testAcc,
      findings: 'Normal brain CT',
      impression: 'Normal',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Patient MRN is required');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('dispatches submit with action "submit" and updates vault when unlocked', async () => {
    vi.spyOn(config, 'hmisAllowFinalSubmit', 'get').mockReturnValue(true);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          investigationId: 'INV-SUBMIT-123',
          verified: true,
          auditScreenshot: '/proofs/submit-proof.png',
          savedAt: '2026-10-19T07:00:00Z',
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await dispatchHmisSubmit({
      mrn: testMrn,
      accession: testAcc,
      moduleId: '803',
      findings: '<p>No intracranial hemorrhage</p>',
      impression: '<p>Normal CT Brain</p>',
      technique: 'Non-contrast axial CT brain',
      pgrName: 'Dr. PGR Radiologist',
      consultantName: 'Dr. Consultant Radiologist',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('SUBMITTED');
    expect(result.mrn).toBe(testMrn);
    expect(result.accession).toBe(testAcc);

    // Verify fetch payload had action: 'submit'
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toContain('/api/radiology/submit-result');
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody.action).toBe('submit');
    expect(sentBody.mrn).toBe(testMrn);

    // Verify vault status was set to 'submitted'
    const [vaultRecord] = await db
      .select()
      .from(hmisDraftVault)
      .where(eq(hmisDraftVault.patientMrn, testMrn));
    expect(vaultRecord).toBeDefined();
    expect(vaultRecord.status).toBe('submitted');
  });

  it('handles gateway failure gracefully and returns gateway error message', async () => {
    vi.spyOn(config, 'hmisAllowFinalSubmit', 'get').mockReturnValue(true);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Punjab HMIS Portal Session expired or credentials invalid',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await dispatchHmisSubmit({
      mrn: testMrn,
      accession: testAcc,
      findings: 'CT scan findings',
      impression: 'CT scan impression',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Punjab HMIS Portal Session expired');
  });
});
