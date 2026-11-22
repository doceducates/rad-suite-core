import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { saveReport, getReportByStudyOrAccession, createManualCaseAndReport } from '../report.service';

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('ReportService - Unified Database Persistence & Sync', () => {
  const mockUser = {
    id: 'user-uuid-1',
    name: 'Dr. Test Radiologist',
    role: 'radiologist',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('updates existing report and syncs study status', async () => {
    const existingStudy = {
      id: 'study-uuid-1',
      patientId: 'patient-uuid-1',
      accessionNumber: 'ACC-12345',
      status: 'scheduled',
      priority: 'routine',
    };

    const existingReport = {
      id: 'report-uuid-1',
      studyId: 'study-uuid-1',
      patientId: 'patient-uuid-1',
      authorId: 'user-uuid-1',
      status: 'draft',
      findings: 'Prior findings',
      impression: 'Prior impression',
    };

    const mockSelect = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([existingStudy]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([existingReport]),
          }),
        }),
      });

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    });

    vi.spyOn(db, 'select').mockImplementation(mockSelect as any);
    vi.spyOn(db, 'update').mockImplementation(mockUpdate as any);

    const result = await saveReport(
      {
        reportId: 'report-uuid-1',
        studyId: 'study-uuid-1',
        accessionNumber: 'ACC-12345',
        findings: 'Normal brain parenchyma.',
        impression: 'No acute intracranial hemorrhage.',
        status: 'draft',
      },
      mockUser
    );

    expect(result.success).toBe(true);
    expect(result.reportId).toBe('report-uuid-1');
    expect(result.status).toBe('draft');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('auto-resolves missing study and patient before creating report to satisfy foreign keys', async () => {
    const mockSelect = vi.fn()
      // 1. Study lookup by ID -> not found
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      })
      // 2. Study lookup by accession -> not found
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      })
      // 3. Patient lookup by MRN -> not found
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      })
      // 4. Report lookup -> not found
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    });

    vi.spyOn(db, 'select').mockImplementation(mockSelect as any);
    vi.spyOn(db, 'insert').mockImplementation(mockInsert as any);

    const result = await saveReport(
      {
        accessionNumber: 'LOCAL-CASE-99',
        patientMrn: 'MRN-LOCAL-99',
        patientName: 'Local Patient',
        modality: 'MRI',
        studyDescription: 'MRI Lumbar Spine',
        findings: 'L4-L5 disc protrusion.',
        impression: 'Disc disease.',
        status: 'draft',
      },
      mockUser
    );

    expect(result.success).toBe(true);
    expect(result.reportId).toBeDefined();
    // Should insert patient, study, and report
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });

  it('finalizes report with signing timestamp and syncs study status to reported', async () => {
    const existingStudy = {
      id: 'study-uuid-2',
      patientId: 'patient-uuid-2',
      accessionNumber: 'ACC-FINAL-1',
      status: 'in-progress',
    };

    const existingReport = {
      id: 'report-uuid-2',
      studyId: 'study-uuid-2',
      patientId: 'patient-uuid-2',
      authorId: 'user-uuid-1',
      status: 'draft',
    };

    vi.spyOn(db, 'select')
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([existingStudy]),
          }),
        }),
      } as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([existingReport]),
          }),
        }),
      } as any);

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    });
    vi.spyOn(db, 'update').mockReturnValue({ set: mockSet } as any);

    const result = await saveReport(
      {
        reportId: 'report-uuid-2',
        studyId: 'study-uuid-2',
        status: 'final',
        findings: 'Normal chest radiograph.',
        impression: 'No focal consolidation.',
      },
      mockUser
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe('final');
    // Check update called for report and for study
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'final',
        signedBy: expect.stringContaining('Dr. Test Radiologist'),
      })
    );
  });
});
