import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueHmisDrafts } from '../hmis-background-queue.service';
import { notify } from '@/services/notification.service';

describe('HMIS Batch & Direct Submit Workflow Integration Tests', () => {
  const testAcc1 = '192611005991';
  const testAcc2 = '192611005992';
  const testMrn = '19202523762063';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('routes to /api/hmis/submit when action is "submit" and includes all clinical parameters', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/reports/study/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            report: {
              findings: 'No disc protrusion or canal stenosis',
              impression: 'Normal study',
              technique: 'Routine MRI Lumbar Spine',
            },
            study: { patientMrn: testMrn },
          }),
        });
      }
      if (url === '/api/hmis/submit') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            investigationId: 'INV-SUBMIT-888',
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'Not found' }) });
    });

    vi.stubGlobal('fetch', fetchSpy);

    const onComplete = vi.fn();
    enqueueHmisDrafts(
      [
        {
          studyId: 'std-test-1',
          accessionNumber: testAcc1,
          patientMrn: testMrn,
          patientName: 'M Maqsood',
          modality: 'MR',
          scanType: 'MRI Lumbar Spine',
          technique: 'Routine MRI Lumbar Spine',
          findings: 'No disc protrusion',
          impression: 'Normal study',
        },
      ],
      {
        action: 'submit',
        doctorName: 'Dr. Muhammad Mudassir',
        onComplete,
      }
    );

    // Allow queue promise ticks to settle
    await new Promise((r) => setTimeout(r, 100));

    expect(onComplete).toHaveBeenCalled();
    const submitCall = fetchSpy.mock.calls.find((call) => call[0] === '/api/hmis/submit');
    expect(submitCall).toBeDefined();

    const body = JSON.parse(submitCall![1].body);
    expect(body.patientMrn).toBe(testMrn);
    expect(body.patientName).toBe('M Maqsood');
    expect(body.accessionNumber).toBe(testAcc1);
    expect(body.findings).toBe('No disc protrusion');
    expect(body.impression).toBe('Normal study');
  });

  it('routes to /api/hmis/draft when action is "draft" or omitted', async () => {
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/reports/study/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            report: {
              findings: 'Degenerative lumbar disc bulge at L4-L5',
              impression: 'L4-L5 disc bulge',
            },
            study: { patientMrn: testMrn },
          }),
        });
      }
      if (url === '/api/hmis/draft') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            investigationId: 'INV-DRAFT-999',
          }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'Not found' }) });
    });

    vi.stubGlobal('fetch', fetchSpy);

    const onComplete = vi.fn();
    enqueueHmisDrafts(
      [
        {
          studyId: 'std-test-2',
          accessionNumber: testAcc2,
          patientMrn: testMrn,
          patientName: 'M Maqsood',
          modality: 'MR',
          findings: 'Degenerative lumbar disc bulge at L4-L5',
          impression: 'L4-L5 disc bulge',
        },
      ],
      {
        action: 'draft',
        doctorName: 'Dr. Muhammad Mudassir',
        onComplete,
      }
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(onComplete).toHaveBeenCalled();
    const draftCall = fetchSpy.mock.calls.find((call) => call[0] === '/api/hmis/draft');
    expect(draftCall).toBeDefined();

    const body = JSON.parse(draftCall![1].body);
    expect(body.patientMrn).toBe(testMrn);
    expect(body.accessionNumber).toBe(testAcc2);
  });

  it('skips cases when findings are empty and emits warning toast', async () => {
    const warningSpy = vi.spyOn(notify, 'warning');
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/reports/study/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            report: { findings: '', impression: '' },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    vi.stubGlobal('fetch', fetchSpy);

    const onComplete = vi.fn();
    enqueueHmisDrafts(
      [
        {
          studyId: 'std-empty-findings',
          accessionNumber: '192611009999',
          patientMrn: testMrn,
          findings: '',
        },
      ],
      { onComplete }
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(warningSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipped 192611009999: No report findings found.')
    );
  });
});
