import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_LGH_PACS,
  queryPacsArchive,
  testPacsTcpConnection,
} from '../pacs.service';

vi.mock('../local-cases.service', () => ({
  getLocalCases: vi.fn(() => [
    {
      id: 'INSHA_19202654622321',
      patientName: 'INSHA',
      patientId: '19202654622321',
      accessionNumber: '1050',
      modality: 'MR',
      studyDescription: 'MRI BRAIN',
      studyDate: '20261015',
      age: 25,
      gender: 'Female',
      studyInstanceUid: '1.2.840.1050',
      numInstances: 120,
      folderPath: 'E:/Cases/INSHA',
      series: [],
    },
  ]),
  getLocalCaseById: vi.fn(),
  formatDicomDate: vi.fn(),
}));

describe('PACS Service', () => {

  it('has default configuration matching default PACS settings', () => {
    expect(DEFAULT_LGH_PACS.aeTitle).toBe(process.env.DEFAULT_PACS_AETITLE || 'PACS_CENTRAL');
    expect(DEFAULT_LGH_PACS.host).toBe(process.env.DEFAULT_PACS_HOST || '127.0.0.1');
    expect(DEFAULT_LGH_PACS.port).toBe(8040);
    expect(DEFAULT_LGH_PACS.callingAeTitle).toBe(process.env.DEFAULT_PACS_CALLING_AE || 'RAD_SUITE');
    expect(DEFAULT_LGH_PACS.listenerPort).toBe(11112);
    expect(DEFAULT_LGH_PACS.retrieveProtocol).toBe('C-GET');
  });

  it('filters PACS archive by modality', async () => {
    const mriResults = await queryPacsArchive({ modality: 'MRI' });
    expect(mriResults.length).toBeGreaterThan(0);
    mriResults.forEach((r) => expect(['MR', 'MRI']).toContain(r.modality));
  });

  it('filters PACS archive by accession number', async () => {
    const results = await queryPacsArchive({ accessionNumber: '1050' });
    expect(results.length).toBe(1);
    expect(results[0].patientName).toBe('INSHA');
  });

  it('filters PACS archive by patient MRN', async () => {
    const results = await queryPacsArchive({ patientMrn: '19202654622321' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].patientName).toBe('INSHA');
  });

  it('handles connection timeout gracefully without throwing', async () => {
    // Unreachable test IP to verify error handling
    const result = await testPacsTcpConnection('192.0.2.1', 8040, 100);
    expect(result.reachable).toBe(false);
    expect(typeof result.latencyMs).toBe('number');
  });
});
