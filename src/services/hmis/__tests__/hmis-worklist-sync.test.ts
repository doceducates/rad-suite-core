import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncHmisAndPacsWorklist, syncCaseTrackingStatus } from '../hmis-worklist-sync.service';
import { runWorklistRetentionCleanup } from '../../worklist-retention.service';
import * as gatewayClient from '../hmis-gateway-client.service';

vi.mock('../hmis-gateway-client.service', () => ({
  checkGatewayHealth: vi.fn(),
  fetchHmisWorklist: vi.fn(),
  trackHmisReport: vi.fn(),
}));

vi.mock('@/services/audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue({}),
}));

describe('HMIS Worklist Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles offline HMIS gateway gracefully', async () => {
    vi.mocked(gatewayClient.checkGatewayHealth).mockResolvedValueOnce({
      online: false,
      extensionConnected: false,
    });

    const result = await syncHmisAndPacsWorklist();
    expect(result.totalFetched).toBe(0);
    expect(result.error).toContain('offline or unreachable');
  });

  it('handles invalid or empty worklist data gracefully', async () => {
    vi.mocked(gatewayClient.checkGatewayHealth).mockResolvedValueOnce({
      online: true,
      extensionConnected: true,
    });
    vi.mocked(gatewayClient.fetchHmisWorklist).mockResolvedValueOnce({
      success: false,
      error: 'Session timeout',
    });

    const result = await syncHmisAndPacsWorklist();
    expect(result.totalFetched).toBe(0);
    expect(result.error).toBe('Session timeout');
  });

  it('syncCaseTrackingStatus returns null if tracking query fails', async () => {
    vi.mocked(gatewayClient.trackHmisReport).mockResolvedValueOnce({
      success: false,
      error: 'Accession not found',
    });

    const res = await syncCaseTrackingStatus('ACC-TEST-999');
    expect(res).toBeNull();
  });

  it('runs worklist retention cleanup safely without errors', async () => {
    const summary = await runWorklistRetentionCleanup(60);
    expect(summary).toBeDefined();
    expect(typeof summary.orphanedOrdersPruned).toBe('number');
  });

  it('forwards filters and unwraps envelope data structure cleanly', async () => {
    vi.mocked(gatewayClient.checkGatewayHealth).mockResolvedValueOnce({
      online: true,
      extensionConnected: true,
    });
    vi.mocked(gatewayClient.fetchHmisWorklist).mockResolvedValueOnce({
      success: true,
      data: {
        totalRecords: 1,
        page: 1,
        perPage: 50,
        hasNextPage: false,
        records: [
          {
            mrn: '192026999999',
            patientName: 'Test Patient Filtered',
            gender: 'Male',
            accession: '192610999999',
            investigationId: '59999999',
            modality: 'CT',
            cpt: 'CT Brain Plain',
          },
        ],
      },
    });

    const result = await syncHmisAndPacsWorklist({ modality: 'CT', perPage: 50 });
    expect(gatewayClient.fetchHmisWorklist).toHaveBeenCalledWith(
      expect.objectContaining({ modality: 'CT', perPage: 50 })
    );
    expect(result.error).toBeUndefined();
  });
});
