import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clinicTaskTracker } from '../clinic-task-tracker.service';
import { notify } from '../notification.service';

vi.mock('../notification.service', () => ({
  notify: {
    progress: vi.fn(),
    updateProgress: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClinicTaskTrackerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clinicTaskTracker.clear();
  });

  it('enqueues batch uploads and renders progress notification', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, count: 2 }),
    });

    const studies = [
      { accession: '192611003147', patientName: 'KISHAWER ALI', modality: 'MR' },
      { accession: '192611003131', patientName: 'SHAH ZAMAN', modality: 'MR' },
    ];

    const res = await clinicTaskTracker.enqueueUpload(studies, 'node-desktop-1ldu8l1');
    expect(res).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/pacs/bulk-sync', expect.any(Object));

    expect(notify.progress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'clinic-node-s3-upload',
        title: 'Clinic Node Cloud Upload (S3)',
        total: 2,
        current: 0,
      })
    );
  });

  it('reconciles telemetry with activeUpload and syncedStudies', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, count: 1 }),
    });

    await clinicTaskTracker.enqueueUpload([
      { accession: '192611003147', patientName: 'KISHAWER ALI' },
    ]);

    // Simulate node reporting active upload
    clinicTaskTracker.syncWithTelemetry({
      nodeId: 'node-desktop-1ldu8l1',
      online: true,
      activeUpload: {
        accession: '192611003147',
        patientName: 'KISHAWER ALI',
        modality: 'MR',
        completedSlices: 40,
        totalSlices: 81,
        progressPercent: 49,
      },
      syncedStudies: [],
    } as any);

    expect(notify.progress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'clinic-node-s3-upload',
        statusText: expect.stringContaining('Uploading: 40/81 slices'),
      })
    );

    // Simulate node finishing upload
    clinicTaskTracker.syncWithTelemetry({
      nodeId: 'node-desktop-1ldu8l1',
      online: true,
      activeUpload: null,
      syncedStudies: [
        { accession: '192611003147', patientName: 'KISHAWER ALI', sliceCount: 81 },
      ],
    } as any);

    expect(notify.progress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'clinic-node-s3-upload',
        completed: true,
        current: 1,
        total: 1,
      })
    );
  });

  it('tracks settings save and acknowledges upon heartbeat', async () => {
    const dispatchFn = vi.fn().mockResolvedValue({ success: true });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        telemetry: {
          nodeId: 'node-desktop-1ldu8l1',
          lastHeartbeat: new Date().toISOString(),
        },
      }),
    });

    const res = await clinicTaskTracker.trackSettingsSave(
      'node-desktop-1ldu8l1',
      { diskCap: 200 },
      dispatchFn
    );

    expect(res).toBe(true);
    expect(dispatchFn).toHaveBeenCalledWith('save-all-settings', { diskCap: 200 });
    expect(notify.progress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'clinic-node-settings-sync',
        completed: true,
        statusText: expect.stringContaining('Policies applied on node-desktop-1ldu8l1'),
      })
    );
  });
});
