import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReportPendingSchema } from '@/lib/validation';
import { setReportPending } from '../report.service';
import { recordReportRevision, getReportRevisions, restoreReportRevision } from '../report-revision.service';
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

describe('Report Pending & Revision Workflow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should validate valid clinical pending reasons with ReportPendingSchema', () => {
    const valid = {
      reportId: '123-abc',
      pendingReason: 'awaiting_prior_images' as const,
      pendingNotes: 'Requested prior CT from external hospital archive.',
    };
    const res = ReportPendingSchema.safeParse(valid);
    expect(res.success).toBe(true);

    // Verify study_case reason is valid
    const studyCaseRes = ReportPendingSchema.safeParse({
      reportId: '123-abc',
      pendingReason: 'study_case',
      pendingNotes: 'Fascinating brain tumor case held for morning reporting class.',
    });
    expect(studyCaseRes.success).toBe(true);
  });

  it('should accept null pendingReason when clearing hold to resume case', () => {
    const clearHold = {
      reportId: '123-abc',
      pendingReason: null,
      pendingNotes: '',
    };
    const res = ReportPendingSchema.safeParse(clearHold);
    expect(res.success).toBe(true);
    expect(res.data?.pendingReason).toBeNull();
  });

  it('should reject invalid pending reason codes', () => {
    const invalid = {
      reportId: '123-abc',
      pendingReason: 'not_a_valid_clinical_reason',
    };
    const res = ReportPendingSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('should set report to pending state with clinical reason and user author', async () => {
    const capturedUpdates: any[] = [];
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        { id: 'rep-001', studyId: 'study-123456789012', status: 'draft', findings: 'Normal brain.' },
      ])
    );

    vi.spyOn(db, 'update').mockImplementation((() => ({
      set: (vals: any) => {
        capturedUpdates.push(vals);
        return {
          where: () => Promise.resolve(),
        };
      },
    })) as any);

    vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: () => Promise.resolve(),
    })) as any);

    const result = await setReportPending(
      {
        reportId: 'rep-001',
        studyId: 'study-123456789012',
        pendingReason: 'awaiting_lab_creatinine',
        pendingNotes: 'Serum creatinine pending from lab.',
      },
      { id: 'user-001', name: 'Dr. PGR Trainee', role: 'pgr' }
    );

    expect(result.success).toBe(true);
    const reportUpdate = capturedUpdates.find((u) => u.pendingReason !== undefined);
    expect(reportUpdate).toBeDefined();
    expect(reportUpdate.pendingReason).toBe('awaiting_lab_creatinine');
    expect(reportUpdate.pendingNotes).toBe('Serum creatinine pending from lab.');
    expect(reportUpdate.pendingBy).toBe('Dr. PGR Trainee');
  });

  it('should record version 1 on initial save and skip duplicate content saves', async () => {
    // 1. First save: no prior revisions exist
    vi.spyOn(db, 'select').mockImplementation(() => createMockQueryChain([]));
    const insertedValues: any[] = [];
    vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: (vals: any) => {
        insertedValues.push(vals);
        return Promise.resolve();
      },
    })) as any);

    const res1 = await recordReportRevision({
      reportId: 'rep-100',
      updateData: { findings: 'Normal chest radiograph.', impression: 'No acute abnormality.' },
      user: { id: 'usr-1', name: 'Dr. User', role: 'consultant' },
      status: 'draft',
    });

    expect(res1.created).toBe(true);
    expect(res1.version).toBe(1);
    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0].version).toBe(1);

    // 2. Second save with identical content: should detect duplicate and skip
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        {
          id: 'rev-1',
          reportId: 'rep-100',
          version: 1,
          findings: 'Normal chest radiograph.',
          impression: 'No acute abnormality.',
          technique: '',
          recommendation: '',
          status: 'draft',
        },
      ])
    );

    const res2 = await recordReportRevision({
      reportId: 'rep-100',
      updateData: { findings: 'Normal chest radiograph.', impression: 'No acute abnormality.' },
      user: { id: 'usr-1', name: 'Dr. User', role: 'consultant' },
      status: 'draft',
    });

    expect(res2.created).toBe(false);
    expect(res2.version).toBe(1);
  });

  it('should increment version when content changes', async () => {
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        {
          id: 'rev-1',
          reportId: 'rep-100',
          version: 1,
          findings: 'Normal chest radiograph.',
          impression: 'No acute abnormality.',
          technique: '',
          recommendation: '',
          status: 'draft',
        },
      ])
    );

    const inserted: any[] = [];
    vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: (vals: any) => {
        inserted.push(vals);
        return Promise.resolve();
      },
    })) as any);

    const res = await recordReportRevision({
      reportId: 'rep-100',
      updateData: { findings: 'Right lower lobe consolidation.', impression: 'Pneumonia.' },
      user: { id: 'usr-1', name: 'Dr. User', role: 'consultant' },
      status: 'draft',
    });

    expect(res.created).toBe(true);
    expect(res.version).toBe(2);
    expect(inserted[0].version).toBe(2);
    expect(inserted[0].findings).toBe('Right lower lobe consolidation.');
  });

  it('should fetch report revisions ordered by version', async () => {
    const mockRevisions = [
      { id: 'rev-2', reportId: 'rep-001', version: 2, status: 'final', authorRole: 'consultant' },
      { id: 'rev-1', reportId: 'rep-001', version: 1, status: 'submitted', authorRole: 'pgr' },
    ];

    vi.spyOn(db, 'select').mockImplementation(() => createMockQueryChain(mockRevisions));

    const revisions = await getReportRevisions('rep-001');
    expect(revisions).toHaveLength(2);
    expect(revisions[0].version).toBe(2);
    expect(revisions[1].authorRole).toBe('pgr');
  });

  it('should restore historical revision and create an additive revision with audit trail', async () => {
    const historicalRev = {
      id: 'rev-1',
      reportId: 'rep-restore',
      version: 1,
      findings: 'Original baseline findings.',
      impression: 'Baseline impression.',
      technique: 'Standard axial MRI',
      recommendation: 'Follow-up in 6 months.',
      status: 'draft',
    };

    let selectCalls = 0;
    vi.spyOn(db, 'select').mockImplementation(() => {
      selectCalls++;
      // 1: lookup report by id -> [{ id: 'rep-restore' }]
      // 2: lookup historical revision -> [historicalRev]
      // 3: lookup latest revision for recordReportRevision -> [{ version: 2 }]
      // 4: prune query in recordReportRevision -> []
      // 5: final updated report lookup -> [{ id: 'rep-restore', findings: 'Original baseline findings.' }]
      if (selectCalls === 1 || selectCalls === 5) {
        return createMockQueryChain([{ id: 'rep-restore', findings: 'Original baseline findings.' }]);
      }
      if (selectCalls === 2) {
        return createMockQueryChain([historicalRev]);
      }
      if (selectCalls === 3) {
        return createMockQueryChain([{ ...historicalRev, version: 2 }]);
      }
      return createMockQueryChain([]);
    });

    const updatedData: any[] = [];
    vi.spyOn(db, 'update').mockImplementation((() => ({
      set: (vals: any) => {
        updatedData.push(vals);
        return { where: () => Promise.resolve() };
      },
    })) as any);

    const insertedRevs: any[] = [];
    vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: (vals: any) => {
        insertedRevs.push(vals);
        return Promise.resolve();
      },
    })) as any);

    const restoreRes = await restoreReportRevision('rep-restore', 1, {
      id: 'usr-admin',
      name: 'Dr. Lead Radiologist',
      role: 'consultant',
    });

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.version).toBe(3); // Increment from version 2 to 3
    expect(updatedData[0].findings).toBe('Original baseline findings.');
    expect(insertedRevs[0].notes).toBe('Restored from v1');
  });

  it('should skip creating a revision during auto-save if a baseline exists', async () => {
    // Existing baseline version 1
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        {
          id: 'rev-1',
          reportId: 'rep-autosave',
          version: 1,
          findings: 'Old findings',
          impression: 'Old impression',
          status: 'draft',
        },
      ])
    );

    const inserted: any[] = [];
    vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: (vals: any) => {
        inserted.push(vals);
        return Promise.resolve();
      },
    })) as any);

    const res = await recordReportRevision({
      reportId: 'rep-autosave',
      updateData: { findings: 'Old findings with auto-saved micro-edit.' },
      user: { id: 'usr-1', name: 'Dr. User', role: 'consultant' },
      status: 'draft',
      isAutoSave: true,
    });

    // Auto-save must NOT create a new revision row or bump version
    expect(res.created).toBe(false);
    expect(res.version).toBe(1);
    expect(inserted).toHaveLength(0);
  });

  it('should create initial version 1 on auto-save if no baseline revision exists yet', async () => {
    // No baseline exists yet
    vi.spyOn(db, 'select').mockImplementation(() => createMockQueryChain([]));

    const inserted: any[] = [];
    vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: (vals: any) => {
        inserted.push(vals);
        return Promise.resolve();
      },
    })) as any);

    const res = await recordReportRevision({
      reportId: 'rep-first-auto',
      updateData: { findings: 'First draft sentence.' },
      user: { id: 'usr-1', name: 'Dr. User', role: 'consultant' },
      status: 'draft',
      isAutoSave: true,
    });

    expect(res.created).toBe(true);
    expect(res.version).toBe(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].version).toBe(1);
  });

  it('should create new version on manual save (isAutoSave: false) when content changes', async () => {
    vi.spyOn(db, 'select').mockImplementation(() =>
      createMockQueryChain([
        {
          id: 'rev-1',
          reportId: 'rep-manual',
          version: 1,
          findings: 'Initial findings',
          impression: 'Initial impression',
          status: 'draft',
        },
      ])
    );

    const inserted: any[] = [];
    vi.spyOn(db, 'insert').mockImplementation((() => ({
      values: (vals: any) => {
        inserted.push(vals);
        return Promise.resolve();
      },
    })) as any);

    const res = await recordReportRevision({
      reportId: 'rep-manual',
      updateData: { findings: 'Manual save committed findings.' },
      user: { id: 'usr-1', name: 'Dr. User', role: 'consultant' },
      status: 'draft',
      isAutoSave: false,
    });

    expect(res.created).toBe(true);
    expect(res.version).toBe(2);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].version).toBe(2);
  });
});
