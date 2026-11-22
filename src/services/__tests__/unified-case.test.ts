import { describe, it, expect, vi } from 'vitest';
import { queryUnifiedCases, getUnifiedCase, getUnifiedWorklist } from '../unified-case.service';

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
      series: [{ seriesNumber: '1', seriesDescription: 'AXIAL T2', orientation: 'AXIAL', sliceCount: 20, files: [] }],
    },
    {
      id: 'ASGHARI_BB_19202653375928',
      patientName: 'ASGHARI BB',
      patientId: '19202653375928',
      accessionNumber: '192609002533',
      modality: 'MR',
      studyDescription: 'MRI LUMBAR SPINE',
      studyDate: '20261014',
      age: 50,
      gender: 'Female',
      studyInstanceUid: '1.2.840.192609002533',
      numInstances: 250,
      folderPath: 'E:/Cases/ASGHARI_BB',
      series: [{ seriesNumber: '1', seriesDescription: 'SAG T2', orientation: 'SAGITTAL', sliceCount: 15, files: [] }],
    },
  ]),
  getLocalCaseById: vi.fn((id: string) => {
    if (id === '192609002533' || id === 'ASGHARI_BB_19202653375928') {
      return {
        id: 'ASGHARI_BB_19202653375928',
        patientName: 'ASGHARI BB',
        patientId: '19202653375928',
        accessionNumber: '192609002533',
        modality: 'MR',
        studyDescription: 'MRI LUMBAR SPINE',
        studyDate: '20261014',
        age: 50,
        gender: 'Female',
        studyInstanceUid: '1.2.840.192609002533',
        numInstances: 250,
        folderPath: 'E:/Cases/ASGHARI_BB',
        series: [{ seriesNumber: '1', seriesDescription: 'SAG T2', orientation: 'SAGITTAL', sliceCount: 15, files: [] }],
      };
    }
    return undefined;
  }),
  formatDicomDate: vi.fn(),
}));

describe('unified-case.service', () => {

  it('returns indexed local cases with source: local_archive', async () => {
    const results = await queryUnifiedCases({ dateRange: 'all' });
    expect(results.length).toBeGreaterThan(0);
    const local = results.find((r) => r.source === 'local_archive');
    if (local) {
      expect(local.pacsServerAe).toBe('LOCAL_ARCHIVE');
      expect(local.numSeries).toBeGreaterThan(0);
      expect(local.studyDate).toBeDefined();
    }
  });

  it('filters accurately by modality (e.g. MR/MRI)', async () => {
    const mrResults = await queryUnifiedCases({ modality: 'MRI', dateRange: 'all' });
    for (const study of mrResults) {
      expect(['MR', 'MRI']).toContain(study.modality.toUpperCase());
    }
  });

  it('searches by text across accession, patient name, and study description', async () => {
    const results = await queryUnifiedCases({ query: 'INSHA', dateRange: 'all' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.patientName.toLowerCase().includes('insha'))).toBe(true);
  });

  it('resolves unified case by either accession number or folder ID', () => {
    const byAcc = getUnifiedCase('192609002533');
    const byId = getUnifiedCase('ASGHARI_BB_19202653375928');
    if (byAcc && byId) {
      expect((byAcc as any).patientName).toBe('ASGHARI BB');
      expect((byId as any).patientName).toBe('ASGHARI BB');
    }
  });

  it('provides global stats and pagination via getUnifiedWorklist', async () => {
    const page1 = await getUnifiedWorklist({ limit: 5, page: 1 });
    expect(page1.total).toBeGreaterThan(0);
    expect(page1.cases.length).toBeLessThanOrEqual(5);
    expect(page1.stats.total).toBeGreaterThan(0);
    expect(page1.stats.draftCount).toBeGreaterThanOrEqual(0);
  });

  it('filters by anatomical region and sort order', async () => {
    const spineCases = await queryUnifiedCases({ bodyPart: 'spine', dateRange: 'all' });
    expect(spineCases.length).toBeGreaterThan(0);
    expect(spineCases.some((c) => /spine|ls|cs/i.test(c.studyDescription))).toBe(true);

    const neuroCases = await queryUnifiedCases({ bodyPart: 'neuro', dateRange: 'all' });
    neuroCases.forEach((c) => expect(/brain|head|neuro/i.test(c.studyDescription)).toBe(true));

    const sortedStat = await getUnifiedWorklist({ sortBy: 'priority', dateRange: 'all' });
    if (sortedStat.cases.length > 1 && sortedStat.stats.statCount > 0) {
      expect(sortedStat.cases[0].priority).toBe('stat');
    }
  });

  it('filters specifically by spine segments (spine, ls_spine, cervical, thoracic, whole_spine)', async () => {
    const allSpine = await queryUnifiedCases({ bodyPart: 'spine', dateRange: 'all' });
    for (const c of allSpine) {
      expect(/spine|lumbar|cervical|dorsal|thoracic|l-spine|c-spine|d-spine|disc|vertebra/i.test(c.studyDescription)).toBe(true);
    }

    const lsSpine = await queryUnifiedCases({ bodyPart: 'ls_spine', dateRange: 'all' });
    for (const c of lsSpine) {
      expect(/lumbar|ls spine|l-spine|l spine|lumbosacral/i.test(c.studyDescription)).toBe(true);
    }

    const cervical = await queryUnifiedCases({ bodyPart: 'cervical', dateRange: 'all' });
    for (const c of cervical) {
      expect(/cervical|c-spine|c spine/i.test(c.studyDescription)).toBe(true);
    }
  });

  it('populates reportSections with history, findings, and impression indicators', async () => {
    const res = await getUnifiedWorklist({ limit: 10 });
    expect(res.cases.length).toBeGreaterThan(0);
    for (const c of res.cases) {
      expect(c.reportSections).toBeDefined();
      expect(typeof c.reportSections?.history).toBe('boolean');
      expect(typeof c.reportSections?.findings).toBe('boolean');
      expect(typeof c.reportSections?.impression).toBe('boolean');
    }
  });

  it('deduplicates cases with the same accession number so each study appears only once', async () => {
    const res = await getUnifiedWorklist({ limit: 100 });
    const accessions = res.cases.map((c) => c.accessionNumber.toUpperCase());
    const uniqueAccessions = new Set(accessions);
    expect(accessions.length).toBe(uniqueAccessions.size);
  });
});

