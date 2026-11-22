import { describe, it, expect } from 'vitest';
import { consolidatePatientStudies } from '../unified-case-grouping';
import { getUnifiedWorklist } from '../unified-case.service';
import { formatWhatsappHandover } from '@/lib/whatsapp-handover';
import type { PacsStudyResult } from '@/types/pacs';

describe('multi-study patient consolidation', () => {
  const createMockStudy = (overrides: Partial<PacsStudyResult>): PacsStudyResult => {
    const mrn = overrides.patientMrn !== undefined ? overrides.patientMrn : 'MRN-100';
    return {
      accessionNumber: 'ACC-001',
      patientId: mrn,
      patientMrn: mrn,
      patientName: 'TEST PATIENT',
      age: 30,
      gender: 'Female',
      modality: 'MRI',
      studyDescription: 'MRI CERVICAL SPINE',
      studyDate: '2026-10-14',
      studyTime: '10:00:00',
      numInstances: 120,
      numSeries: 4,
      pacsServerAe: 'TEST_PACS',
      studyInstanceUid: '1.2.3.4.5',
      status: 'scheduled',
      priority: 'routine',
      source: 'pacs',
      ...overrides,
    };
  };

  describe('consolidatePatientStudies()', () => {
    it('returns empty array when given empty list', () => {
      const results = consolidatePatientStudies([]);
      expect(results).toEqual([]);
    });

    it('keeps single study cases unchanged with isMultiStudy: false', () => {
      const caseA = createMockStudy({ accessionNumber: 'ACC-A', patientMrn: 'MRN-A' });
      const caseB = createMockStudy({ accessionNumber: 'ACC-B', patientMrn: 'MRN-B' });
      const results = consolidatePatientStudies([caseA, caseB]);

      expect(results).toHaveLength(2);
      expect(results[0].accessionNumber).toBe('ACC-A');
      expect(results[0].isMultiStudy).toBe(false);
      expect(results[1].accessionNumber).toBe('ACC-B');
      expect(results[1].isMultiStudy).toBe(false);
    });

    it('consolidates 3 spine MRI studies under same MRN into 1 row', () => {
      const study1 = createMockStudy({
        accessionNumber: '192610002964',
        patientMrn: '61202523608470',
        patientName: 'RAMEEN ABID',
        studyDescription: 'MRI CERVICAL SPINE',
        numInstances: 120,
        numSeries: 4,
      });
      const study2 = createMockStudy({
        accessionNumber: '192610002966',
        patientMrn: '61202523608470',
        patientName: 'RAMEEN ABID',
        studyDescription: 'MRI LUMBOSACRAL SPINE',
        numInstances: 150,
        numSeries: 5,
      });
      const study3 = createMockStudy({
        accessionNumber: '192610002967',
        patientMrn: '61202523608470',
        patientName: 'RAMEEN ABID',
        studyDescription: 'MRI DORSAL SPINE',
        numInstances: 140,
        numSeries: 4,
      });

      const results = consolidatePatientStudies([study1, study2, study3]);

      expect(results).toHaveLength(1);
      const consolidated = results[0];
      expect(consolidated.isMultiStudy).toBe(true);
      expect(consolidated.patientMrn).toBe('61202523608470');
      expect(consolidated.patientName).toBe('RAMEEN ABID');
      expect(consolidated.studies).toBeDefined();
      expect(consolidated.studies).toHaveLength(3);

      const accessions = consolidated.studies!.map((s) => s.accessionNumber);
      expect(accessions).toEqual(['192610002964', '192610002966', '192610002967']);
      expect(consolidated.numInstances).toBe(410);
      expect(consolidated.numSeries).toBe(13);
    });

    it('propagates STAT priority and critical findings to consolidated parent', () => {
      const routineStudy = createMockStudy({
        accessionNumber: 'ACC-1',
        patientMrn: 'MRN-URGENT',
        priority: 'routine',
        criticalFinding: false,
      });
      const statStudy = createMockStudy({
        accessionNumber: 'ACC-2',
        patientMrn: 'MRN-URGENT',
        priority: 'stat',
        criticalFinding: true,
      });

      const results = consolidatePatientStudies([routineStudy, statStudy]);
      expect(results).toHaveLength(1);
      expect(results[0].priority).toBe('stat');
      expect(results[0].criticalFinding).toBe(true);
    });

    it('does not group generic or unknown MRNs to avoid unintended merges', () => {
      const unknown1 = createMockStudy({ accessionNumber: 'ACC-UNK-1', patientMrn: 'unknown' });
      const unknown2 = createMockStudy({ accessionNumber: 'ACC-UNK-2', patientMrn: 'unknown' });
      const noMrn1 = createMockStudy({ accessionNumber: 'ACC-NONE-1', patientMrn: '' });
      const noMrn2 = createMockStudy({ accessionNumber: 'ACC-NONE-2', patientMrn: '' });

      const results = consolidatePatientStudies([unknown1, unknown2, noMrn1, noMrn2]);
      expect(results).toHaveLength(4);
    });
  });

  describe('getUnifiedWorklist() grouping integration', () => {
    it('consolidates multi-study patient into 1 row by default', async () => {
      const res = await getUnifiedWorklist({ query: '61202523608470' });
      if (res.cases.length > 0) {
        expect(res.cases).toHaveLength(1);
        expect(res.cases[0].isMultiStudy).toBe(true);
        expect(res.cases[0].studies && res.cases[0].studies.length).toBeGreaterThan(1);
      }
    });

    it('supports groupBy: "study" to return individual study rows without merging', async () => {
      const byDefault = await getUnifiedWorklist({ query: '61202523608470' });
      const byStudy = await getUnifiedWorklist({ query: '61202523608470', groupBy: 'study' });
      if (byDefault.cases.length > 0 && byDefault.cases[0].isMultiStudy) {
        expect(byStudy.cases.length).toBeGreaterThan(byDefault.cases.length);
      }
    });
  });

  describe('formatWhatsappHandover() multi-study display', () => {
    it('formats multi-study cases with bulleted list of all individual accessions', () => {
      const multiCase = createMockStudy({
        accessionNumber: '192610002964',
        patientMrn: '61202523608470',
        patientName: 'RAMEEN ABID',
        isMultiStudy: true,
        studies: [
          createMockStudy({ accessionNumber: '192610002964', modality: 'MRI', studyDescription: 'MRI CERVICAL SPINE' }),
          createMockStudy({ accessionNumber: '192610002966', modality: 'MRI', studyDescription: 'MRI LUMBOSACRAL SPINE' }),
          createMockStudy({ accessionNumber: '192610002967', modality: 'MRI', studyDescription: 'MRI DORSAL SPINE' }),
        ],
      });

      const text = formatWhatsappHandover([multiCase]);
      expect(text).toContain('RAMEEN ABID');
      expect(text).toContain('Studies Ordered (3):');
      expect(text).toContain('`192610002964` — [MRI] MRI CERVICAL SPINE');
      expect(text).toContain('`192610002966` — [MRI] MRI LUMBOSACRAL SPINE');
      expect(text).toContain('`192610002967` — [MRI] MRI DORSAL SPINE');
    });
  });
});
