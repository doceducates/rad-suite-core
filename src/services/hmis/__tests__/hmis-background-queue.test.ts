import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueHmisDrafts, hmisBackgroundQueue, HmisDraftItem } from '../hmis-background-queue.service';
import { notify } from '@/services/notification.service';

describe('HMIS Background Queue Service', () => {
  beforeEach(() => {
    notify.clearAll();
    vi.restoreAllMocks();
  });

  it('queues drafts and processes them sequentially with live progress', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/reports')) {
        return {
          ok: true,
          json: async () => ({
            report: { findings: 'Normal brain MRI scan.', impression: 'No acute abnormality.' },
          }),
        };
      }
      if (url.includes('/api/hmis/draft')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: { status: 'DRAFT_SAVED' } }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });

    global.fetch = fetchMock;

    const items: HmisDraftItem[] = [
      {
        accessionNumber: 'ACC-BG-001',
        patientMrn: 'MRN-001',
        patientName: 'Patient One',
        scanType: 'MRI Brain',
        modality: 'MRI',
        findings: 'Normal brain MRI scan.',
      },
      {
        accessionNumber: 'ACC-BG-002',
        patientMrn: 'MRN-002',
        patientName: 'Patient Two',
        scanType: 'MRI Brain',
        modality: 'MRI',
        findings: 'Normal brain MRI scan.',
      },
    ];

    let completedSummary: any = null;
    const onComplete = vi.fn((summary) => {
      completedSummary = summary;
    });

    const jobId = enqueueHmisDrafts(items, {
      doctorName: 'Dr. Test PGR',
      onComplete,
    });

    expect(jobId).toBe('hmis-bg-queue');

    // Wait for the async queue worker loop to finish
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(onComplete).toHaveBeenCalled();
    expect(completedSummary).toMatchObject({ succeeded: 2, failed: 0, skipped: 0 });
    expect(completedSummary.results).toHaveLength(2);

    const notifications = notify.getSnapshot();
    const successToast = notifications.find(
      (n) => n.type === 'success' && n.message.includes('All 2 drafts successfully saved')
    );
    expect(successToast).toBeDefined();
  });

  it('skips cases without findings and emits a warning toast', async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/reports')) {
        return {
          ok: true,
          json: async () => ({ report: null }),
        };
      }
      return { ok: true, json: async () => ({ success: true }) };
    });

    const emptyItems: HmisDraftItem[] = [
      {
        accessionNumber: 'ACC-EMPTY-001',
        findings: '',
      },
    ];

    let summaryResult: any = null;
    enqueueHmisDrafts(emptyItems, {
      onComplete: (s) => {
        summaryResult = s;
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(summaryResult).toMatchObject({ succeeded: 0, failed: 0, skipped: 1 });
    expect(summaryResult.results).toHaveLength(1);
    const notifications = notify.getSnapshot();
    const warningToast = notifications.find(
      (n) => n.type === 'warning' && n.message.includes('No report findings found')
    );
    expect(warningToast).toBeDefined();
  });

  it('forwards hmisInvestigationId and hmisCpt correctly to /api/hmis/draft', async () => {
    let capturedPayload: any = null;
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/hmis/draft')) {
        capturedPayload = JSON.parse(init?.body as string);
        return {
          ok: true,
          json: async () => ({ success: true, data: { status: 'DRAFT_SAVED' } }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });

    const items: HmisDraftItem[] = [
      {
        accessionNumber: '192611001162',
        patientMrn: '48202416809549',
        patientName: 'M HAYAT',
        scanType: 'MRI Lumbosacral Spine Without Contrast',
        modality: 'MRI',
        bodyPart: 'Spine',
        hmisCpt: '99214',
        hmisInvestigationId: '62342593',
        findings: 'Normal lumbar alignment and disc heights.',
        impression: 'No significant lumbar disc herniation.',
      },
    ];

    enqueueHmisDrafts(items, { doctorName: 'Dr. Radiologist' });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(capturedPayload).toBeDefined();
    expect(capturedPayload.investigationId).toBe('62342593');
    expect(capturedPayload.cpt).toBe('99214');
    expect(capturedPayload.accessionNumber).toBe('192611001162');
  });
});
