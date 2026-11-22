import { describe, it, expect } from 'vitest';
import { sortStudies, parseStudyTimestamp } from '../study-sorting';
import type { PacsStudyResult } from '@/types/pacs';

describe('Study Sorting Utility', () => {
  const caseA: PacsStudyResult = {
    accessionNumber: '100001',
    patientName: 'Ali Khan',
    patientMrn: 'MRN-1',
    age: 30,
    gender: 'Male',
    modality: 'CT',
    studyDescription: 'CT Brain',
    studyDate: '2026-10-01T10:00:00Z',
    numSeries: 1,
    numInstances: 20,
    pacsServerAe: 'ORTHANC',
    studyInstanceUid: 'uid-1',
    status: 'scheduled',
    priority: 'routine',
  };

  const caseB: PacsStudyResult = {
    accessionNumber: '100002',
    patientName: 'Zainab Bibi',
    patientMrn: 'MRN-2',
    age: 50,
    gender: 'Female',
    modality: 'MRI',
    studyDescription: 'MRI Spine',
    studyDate: '2026-10-03T15:30:00Z',
    numSeries: 2,
    numInstances: 40,
    pacsServerAe: 'ORTHANC',
    studyInstanceUid: 'uid-2',
    status: 'final',
    priority: 'stat',
  };

  it('correctly parses DICOM and ISO timestamps', () => {
    expect(parseStudyTimestamp('2026-10-01T10:00:00Z')).toBeGreaterThan(0);
    expect(parseStudyTimestamp('20261001', '100000')).toBeGreaterThan(0);
  });

  it('sorts by study date ascending and descending', () => {
    const list = [caseB, caseA];
    
    // date_asc: caseA (Oct 1) then caseB (Oct 3)
    const asc = sortStudies([...list], 'date_asc');
    expect(asc[0].accessionNumber).toBe('100001');
    expect(asc[1].accessionNumber).toBe('100002');

    // date_desc: caseB (Oct 3) then caseA (Oct 1)
    const desc = sortStudies([...list], 'date_desc');
    expect(desc[0].accessionNumber).toBe('100002');
    expect(desc[1].accessionNumber).toBe('100001');
  });

  it('sorts by patient name ascending and descending', () => {
    const list = [caseB, caseA];

    const asc = sortStudies([...list], 'patient_name_asc');
    expect(asc[0].patientName).toBe('Ali Khan');

    const desc = sortStudies([...list], 'patient_name_desc');
    expect(desc[0].patientName).toBe('Zainab Bibi');
  });

  it('sorts by accession number ascending and descending', () => {
    const list = [caseB, caseA];

    const asc = sortStudies([...list], 'accession_asc');
    expect(asc[0].accessionNumber).toBe('100001');

    const desc = sortStudies([...list], 'accession_desc');
    expect(desc[0].accessionNumber).toBe('100002');
  });

  it('sorts by modality ascending and descending', () => {
    const list = [caseB, caseA];

    const asc = sortStudies([...list], 'modality_asc');
    expect(asc[0].modality).toBe('CT');

    const desc = sortStudies([...list], 'modality_desc');
    expect(desc[0].modality).toBe('MRI');
  });

  it('sorts by priority with stat first on priority_desc', () => {
    const list = [caseA, caseB];

    const desc = sortStudies([...list], 'priority_desc');
    expect(desc[0].priority).toBe('stat');
  });
});
