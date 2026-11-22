import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueHmisDrafts, HmisDraftItem } from '../hmis-background-queue.service';
import { extractSections } from '../../unified-case-filters';

describe('HMIS Batch Clinical History Preservation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves and dispatches clinical history authored in report even if study history is empty', async () => {
    let capturedDraftPayload: any = null;

    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: any) => {
      if (url.includes('/api/reports')) {
        return {
          ok: true,
          json: async () => ({
            report: {
              findings: 'L4-L5 disc extrusion causing left exiting root compression.',
              impression: 'L4-L5 left paracentral disc herniation.',
              technique: 'Multiplanar MRI of lumbar spine.',
              clinicalHistory: 'Lower back pain for 2 months radiating to left leg with paresthesia.',
            },
            study: {
              patientMrn: 'MRN-786',
              scanType: 'MRI LS SPINE',
              modality: 'MRI',
              clinicalHistory: '', // Empty at study intake level
            },
          }),
        };
      }
      if (url.includes('/api/hmis/draft')) {
        capturedDraftPayload = JSON.parse(options.body);
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
        accessionNumber: '192610001728',
        studyId: 'test-study-id-1',
        patientMrn: 'MRN-786',
        patientName: 'Test Patient',
        scanType: 'MRI LS SPINE',
        modality: 'MRI',
        // Omit clinicalHistory at worklist item level to simulate un-hydrated selection
      },
    ];

    await new Promise<void>((resolve) => {
      enqueueHmisDrafts(items, {
        doctorName: 'Dr. Jane Doe',
        onComplete: () => resolve(),
      });
    });

    expect(capturedDraftPayload).not.toBeNull();
    expect(capturedDraftPayload.accessionNumber).toBe('192610001728');
    expect(capturedDraftPayload.findings).toContain('L4-L5 disc extrusion');
    expect(capturedDraftPayload.clinicalHistory).toBe(
      'Lower back pain for 2 months radiating to left leg with paresthesia.'
    );
  });

  it('extractSections correctly reflects clinical history authored in report', () => {
    const reportWithHist = {
      clinicalHistory: 'Chronic headache and dizziness',
      findings: 'Unremarkable brain parenchyma.',
      impression: 'Normal study.',
    };
    const emptyStudy = { clinicalHistory: '' };

    const sections = extractSections(reportWithHist, emptyStudy);
    expect(sections.hasClinicalHistory).toBe(true);
    expect(sections.reportSections.history).toBe(true);
  });
});
