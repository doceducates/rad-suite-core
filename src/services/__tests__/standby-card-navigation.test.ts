import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openStandbyStudy } from '@/components/workstation/standby/standby-case-card';
import type { PacsStudyResult } from '@/types/pacs';

describe('Standby Case Card Instant Navigation & Decoupled Retrieval', () => {
  let mockRouter: { push: ReturnType<typeof vi.fn> };
  let mockNotify: {
    info: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  const createMockStudy = (overrides?: Partial<PacsStudyResult>): PacsStudyResult => ({
    accessionNumber: 'ACC100234',
    patientName: 'JOHN DOE',
    patientMrn: 'MRN54321',
    age: 45,
    gender: 'Male',
    modality: 'CT',
    studyDescription: 'CT CHEST WITH CONTRAST',
    studyDate: '20261007',
    numSeries: 3,
    numInstances: 140,
    pacsServerAe: 'HOSP_PACS',
    studyInstanceUid: '1.2.840.113619.2.55.12345',
    source: 'pacs',
    isDownloaded: false,
    ...overrides,
  });

  beforeEach(() => {
    mockRouter = { push: vi.fn() };
    mockNotify = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };
    vi.restoreAllMocks();
  });

  it('navigates immediately (<50ms) to workstation route using accession number', () => {
    const study = createMockStudy({ accessionNumber: 'ACC100234', localCaseId: undefined });
    const startTime = performance.now();

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: vi.fn().mockResolvedValue({ ok: true }) as any,
    });

    const elapsed = performance.now() - startTime;

    expect(elapsed).toBeLessThan(150);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/workspace/ACC100234');
    expect(result.targetUrl).toBe('/workspace/ACC100234');
  });

  it('prefers localCaseId over accessionNumber for workstation route', () => {
    const study = createMockStudy({ accessionNumber: 'ACC100234', localCaseId: 'local-case-999' });

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: vi.fn().mockResolvedValue({ ok: true }) as any,
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/workspace/local-case-999');
    expect(result.targetUrl).toBe('/workspace/local-case-999');
  });

  it('properly URI-encodes identifiers with special characters', () => {
    const study = createMockStudy({ accessionNumber: 'ACC/100 234#X' });

    openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: vi.fn().mockResolvedValue({ ok: true }) as any,
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/workspace/ACC%2F100%20234%23X');
  });

  it('does NOT block navigation when background retrieve takes significant time or hangs', async () => {
    // Simulate a slow PACS download that takes 10 seconds or never resolves
    let retrieveResolver: (val: any) => void;
    const slowRetrievePromise = new Promise((resolve) => {
      retrieveResolver = resolve;
    });
    const mockSlowFetch = vi.fn().mockReturnValue(slowRetrievePromise);

    const study = createMockStudy({ isDownloaded: false, source: 'hospital_pacs' });

    const startTime = performance.now();
    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockSlowFetch as any,
    });
    const elapsed = performance.now() - startTime;

    // Navigation must have happened immediately without waiting for slowRetrievePromise
    expect(elapsed).toBeLessThan(50);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(result.backgroundRetrievalTriggered).toBe(true);
    expect(mockSlowFetch).toHaveBeenCalledTimes(1);

    // Resolve afterwards to clean up
    retrieveResolver!({ ok: true });
  });

  it('dispatches background retrieve with mapped source (pacs -> hospital_pacs)', () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const study = createMockStudy({
      accessionNumber: 'ACC555',
      studyInstanceUid: '1.2.3.4.5',
      patientName: 'ALICE JANE',
      source: 'pacs',
      isDownloaded: false,
    });

    openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockFetch as any,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pacs/retrieve',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessionNumber: 'ACC555',
          studyInstanceUid: '1.2.3.4.5',
          patientName: 'ALICE JANE',
          source: 'hospital_pacs',
        }),
      })
    );
    expect(mockNotify.info).toHaveBeenCalledTimes(1);
    expect(mockNotify.info).toHaveBeenCalledWith(
      expect.stringContaining('caching slices in background'),
      expect.objectContaining({ durationMs: 3000 })
    );
  });

  it('dispatches background retrieve for S3 source without source remapping', () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const study = createMockStudy({
      accessionNumber: 'S3_CASE_01',
      source: 's3',
      isDownloaded: false,
    });

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockFetch as any,
    });

    expect(result.backgroundRetrievalTriggered).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pacs/retrieve',
      expect.objectContaining({
        body: expect.stringContaining('"source":"s3"'),
      })
    );
  });

  it('does NOT trigger retrieve when study is already downloaded', () => {
    const mockFetch = vi.fn();
    const study = createMockStudy({ isDownloaded: true, source: 'hospital_pacs' });

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockFetch as any,
    });

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockNotify.info).not.toHaveBeenCalled();
    expect(result.backgroundRetrievalTriggered).toBe(false);
  });

  it('does NOT trigger retrieve when study source is local_archive', () => {
    const mockFetch = vi.fn();
    const study = createMockStudy({ isDownloaded: false, source: 'local_archive' });

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockFetch as any,
    });

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.backgroundRetrievalTriggered).toBe(false);
  });

  it('does NOT trigger retrieve when study source is local', () => {
    const mockFetch = vi.fn();
    const study = createMockStudy({ isDownloaded: false, source: 'local' as any });

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockFetch as any,
    });

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockNotify.info).not.toHaveBeenCalled();
    expect(result.backgroundRetrievalTriggered).toBe(false);
  });

  it('falls back to studyInstanceUid if localCaseId and accessionNumber are absent', () => {
    const study = createMockStudy({
      localCaseId: undefined,
      accessionNumber: '',
      studyInstanceUid: '1.2.840.113619.2.55.99999',
    });

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: vi.fn() as any,
    });

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/workspace/1.2.840.113619.2.55.99999');
    expect(result.targetUrl).toBe('/workspace/1.2.840.113619.2.55.99999');
  });

  it('blocks navigation and alerts with error notification when identifier is completely empty', () => {
    const mockFetch = vi.fn();
    const study = createMockStudy({
      localCaseId: undefined,
      accessionNumber: '',
      studyInstanceUid: '',
    });

    const result = openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockFetch as any,
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.targetUrl).toBe('');
    expect(result.backgroundRetrievalTriggered).toBe(false);
    expect(mockNotify.error).toHaveBeenCalledTimes(1);
    expect(mockNotify.error).toHaveBeenCalledWith('Unable to open study: Missing case identifier or accession number');
  });

  it('dispatches background retrieve with keepalive: true option', () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const study = createMockStudy({
      accessionNumber: 'ACC_KEEPALIVE_TEST',
      source: 'hospital_pacs',
      isDownloaded: false,
    });

    openStandbyStudy(study, mockRouter, {
      notifyService: mockNotify as any,
      fetchFn: mockFetch as any,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/pacs/retrieve',
      expect.objectContaining({
        keepalive: true,
      })
    );
  });

  it('does NOT crash or interrupt navigation if background retrieve rejects with network error', async () => {
    const mockFailingFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const study = createMockStudy({ isDownloaded: false, source: 'hospital_pacs' });

    expect(() => {
      openStandbyStudy(study, mockRouter, {
        notifyService: mockNotify as any,
        fetchFn: mockFailingFetch as any,
      });
    }).not.toThrow();

    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[StandbyCaseCard] Background retrieve warning:',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });
});
