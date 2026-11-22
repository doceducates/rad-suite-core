import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueHmisDrafts, HmisDraftItem } from '../hmis-background-queue.service';
import { notify } from '@/services/notification.service';

describe('HMIS Multi-Study Companion Combined Dispatch', () => {
  beforeEach(() => {
    notify.clearAll();
    vi.restoreAllMocks();
  });

  it('enqueues and dispatches both primary and companion studies with separate accessions and investigation IDs', async () => {
    const postedPayloads: any[] = [];
    const fetchMock = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      if (url.includes('/api/hmis/draft')) {
        const body = JSON.parse(opts?.body || '{}');
        postedPayloads.push(body);
        return {
          ok: true,
          json: async () => ({ success: true, data: { status: 'DRAFT_SAVED' } }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    global.fetch = fetchMock;

    // Simulate M HAYAT having both Cervical Spine and LS Spine
    const primaryStudy: HmisDraftItem = {
      studyId: 'study-c-spine-1',
      accessionNumber: '192611001164',
      patientMrn: '48202416809549',
      patientName: 'M HAYAT',
      scanType: 'MRI Cervical Spine Without Contrast',
      modality: 'MRI',
      hmisInvestigationId: '62342593',
      findings: '<p>C-spine findings</p>',
      impression: '<p>C-spine impression</p>',
    };

    const companionStudy: HmisDraftItem = {
      studyId: 'study-ls-spine-2',
      accessionNumber: '192611001162',
      patientMrn: '48202416809549',
      patientName: 'M HAYAT',
      scanType: 'MRI Lumbosacral Spine Without Contrast',
      modality: 'MRI',
      hmisInvestigationId: '62342590',
      findings: '<p>LS-spine findings</p>',
      impression: '<p>LS-spine impression</p>',
    };

    const completionPromise = new Promise((resolve) => {
      enqueueHmisDrafts([primaryStudy, companionStudy], {
        onComplete: resolve,
      });
    });

    await completionPromise;

    expect(postedPayloads.length).toBe(2);

    // Verify first payload is Cervical Spine with its distinct investigationId
    expect(postedPayloads[0].accessionNumber).toBe('192611001164');
    expect(postedPayloads[0].investigationId).toBe('62342593');
    expect(postedPayloads[0].scanType).toContain('Cervical');

    // Verify second payload is LS Spine with its distinct investigationId
    expect(postedPayloads[1].accessionNumber).toBe('192611001162');
    expect(postedPayloads[1].investigationId).toBe('62342590');
    expect(postedPayloads[1].scanType).toContain('Lumbosacral');
  });
});
