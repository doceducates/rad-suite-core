import { describe, it, expect } from 'vitest';
import {
  analyzeDiscrepancy,
  reconcileCasePresence,
  annotateWorklistPresence,
} from '../case-reconciliation.service';
import type { SystemPresenceMap, PacsStudyResult } from '@/types/pacs';

describe('Case Reconciliation & Multi-System Discrepancy Matrix', () => {
  it('flags MISSING_IN_HMIS when study is on PACS but absent on HMIS', () => {
    const presence: SystemPresenceMap = {
      pacs: true,
      vitrea: true,
      local: true,
      cloud: false,
      hmis: false,
    };

    const analysis = analyzeDiscrepancy(presence);
    expect(analysis.hasDiscrepancy).toBe(true);
    expect(analysis.type).toBe('MISSING_IN_HMIS');
    expect(analysis.message).toContain('missing on Punjab HMIS portal');
  });

  it('flags MISSING_ON_PACS when study is scheduled in HMIS but absent on PACS', () => {
    const presence: SystemPresenceMap = {
      pacs: false,
      vitrea: false,
      local: false,
      cloud: false,
      hmis: true,
    };

    const analysis = analyzeDiscrepancy(presence);
    expect(analysis.hasDiscrepancy).toBe(true);
    expect(analysis.type).toBe('MISSING_ON_PACS');
    expect(analysis.message).toContain('DICOM imaging has not reached PACS');
  });

  it('flags VITREA_PACS_GAP when present on PACS but absent on Vitrea', () => {
    const presence: SystemPresenceMap = {
      pacs: true,
      vitrea: false,
      local: false,
      cloud: false,
      hmis: true,
    };

    const analysis = analyzeDiscrepancy(presence);
    expect(analysis.hasDiscrepancy).toBe(true);
    expect(analysis.type).toBe('VITREA_PACS_GAP');
  });

  it('reports harmonious synchronization when presence aligns', () => {
    const presence: SystemPresenceMap = {
      pacs: true,
      vitrea: true,
      local: true,
      cloud: true,
      hmis: true,
    };

    const analysis = analyzeDiscrepancy(presence);
    expect(analysis.hasDiscrepancy).toBe(false);
    expect(analysis.type).toBe('NONE');
  });

  it('annotates worklist cases with presence metadata', async () => {
    const sampleCases: PacsStudyResult[] = [
      {
        accessionNumber: 'ACC_RECON_01',
        patientName: 'Test Patient Recon',
        patientMrn: 'MRN001',
        age: 45,
        gender: 'Male',
        modality: 'CT',
        studyDescription: 'CT Chest',
        studyDate: '2026-10-04T00:00:00Z',
        numSeries: 1,
        numInstances: 50,
        pacsServerAe: 'HMIS_PACS',
        studyInstanceUid: 'uid.1.2.3',
        source: 'hospital_pacs',
      },
    ];

    const result = await annotateWorklistPresence(sampleCases);
    expect(result.length).toBe(1);
    expect(result[0].presence).toBeDefined();
    expect(result[0].presence?.pacs).toBe(true);
  });
});
