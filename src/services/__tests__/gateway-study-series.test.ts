import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGatewayStudySeries } from '../gateway-study-series.service';
import { buildSeriesList, DEFAULT_CT_SERIES } from '@/components/workstation/workstation-constants';

describe('Gateway Study Series Resolver & Sequence Builder', () => {
  const origGwUrl = process.env.CLINIC_GATEWAY_URL;

  beforeEach(() => {
    process.env.CLINIC_GATEWAY_URL = 'http://gateway.test';
  });

  afterEach(() => {
    process.env.CLINIC_GATEWAY_URL = origGwUrl;
  });

  it('should resolve anatomically accurate Knee MRI series', async () => {
    // Mock fetch for gateway
    const globalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        study: {
          accessionNumber: '192610003593',
          modality: 'MR',
          studyDescription: 'MR LT KNEE',
          numInstances: 296,
        },
      }),
    } as any);

    try {
      const series = await fetchGatewayStudySeries('192610003593', 'MR');
      expect(series.length).toBe(7);
      expect(series[0].seriesDescription).toBe('Loc 2PL(AX/CO)');
      expect(series[0].orientation).toBe('LOCALIZER');
      expect(series.some((s) => s.seriesDescription.includes('Sagittal T2'))).toBe(true);
      expect(series.some((s) => s.seriesDescription.includes('Coronal PD'))).toBe(true);

      const totalSlices = series.reduce((sum, s) => sum + s.sliceCount, 0);
      expect(totalSlices).toBe(296);
    } finally {
      global.fetch = globalFetch;
    }
  });

  it('should resolve Spine MRI series for spine cases', async () => {
    const globalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        study: {
          accessionNumber: '192610002594',
          modality: 'MR',
          studyDescription: 'MRI L/S Spine',
          numInstances: 140,
        },
      }),
    } as any);

    try {
      const series = await fetchGatewayStudySeries('192610002594', 'MR');
      expect(series.length).toBe(6);
      expect(series[0].seriesDescription).toBe('Loc 3PL C0');
      expect(series.some((s) => s.seriesDescription === 'Sagittal T2')).toBe(true);
      expect(series.some((s) => s.seriesDescription === 'Axial T2')).toBe(true);
      expect(series.some((s) => s.seriesDescription === 'Sagittal STIR')).toBe(true);
    } finally {
      global.fetch = globalFetch;
    }
  });

  it('should buildSeriesList using local series when available', () => {
    const local = [
      { seriesNumber: '1', seriesDescription: 'Custom Series 1', sliceCount: 50, orientation: 'AXIAL' },
      { seriesNumber: '2', seriesDescription: 'Custom Series 2', sliceCount: 50, orientation: 'SAGITTAL' },
    ];
    const list = buildSeriesList(true, local, 'MR', 'Knee');
    expect(list.length).toBe(2);
    expect(list[0].seriesDescription).toBe('Custom Series 1');
  });

  it('should buildSeriesList with anatomy-aware Knee MRI series when falling back', () => {
    const list = buildSeriesList(false, [], 'MR', 'MR LT KNEE');
    expect(list.length).toBe(7);
    expect(list[0].seriesDescription).toBe('Loc 2PL(AX/CO)');
    expect(list.some((s) => s.seriesDescription.includes('Sagittal T2'))).toBe(true);
  });

  it('should buildSeriesList with CT series when modality is CT', () => {
    const list = buildSeriesList(false, [], 'CT', 'CT CHEST');
    expect(list).toEqual(DEFAULT_CT_SERIES);
    expect(list[0].seriesDescription).toBe('Axial Soft Tissue');
  });
});
