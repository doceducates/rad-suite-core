import { describe, it, expect } from 'vitest';
import {
  deduplicatePacsStudies,
  correlateWithLocalWorklist,
  acquireImportLock,
  releaseImportLock,
} from '../pacs-deduplication.service';
import type { PacsStudyResult } from '@/types/pacs';

describe('PACS Deduplication & Worklist Correlation (P1 #14)', () => {
  const sampleStudies: PacsStudyResult[] = [
    {
      studyInstanceUid: '1.2.840.113619.2.55.1.1',
      accessionNumber: 'ACC-2026-001',
      patientName: 'Tehreem Akhtar',
      patientMrn: '19202521012202',
      age: 45,
      gender: 'Female',
      modality: 'CT',
      studyDescription: 'CT Chest HRCT',
      studyDate: '2026-09-18T10:00:00Z',
      numSeries: 1,
      numInstances: 120,
      pacsServerAe: 'HMIS_PACS',
    },
    {
      studyInstanceUid: '1.2.840.113619.2.55.1.1',
      accessionNumber: 'ACC-2026-001', // duplicate accession
      patientName: 'Tehreem Akhtar',
      patientMrn: '19202521012202',
      age: 45,
      gender: 'Female',
      modality: 'CT',
      studyDescription: 'CT Chest High Resolution Without Contrast',
      studyDate: '2026-09-18T10:00:00Z',
      numSeries: 4, // richer series count
      numInstances: 480, // richer instance count
      pacsServerAe: 'HMIS_PACS',
    },
    {
      studyInstanceUid: '1.2.840.113619.2.55.1.2',
      accessionNumber: 'ACC-2026-002',
      patientName: 'Muhammad Tariq',
      patientMrn: '19202644951180',
      age: 52,
      gender: 'Male',
      modality: 'MRI',
      studyDescription: 'MRI Brain with Contrast',
      studyDate: '2026-09-18T11:30:00Z',
      numSeries: 6,
      numInstances: 360,
      pacsServerAe: 'HMIS_PACS',
    },
  ];

  it('deduplicates studies by canonical accession number and merges metadata', () => {
    const deduplicated = deduplicatePacsStudies(sampleStudies);
    expect(deduplicated.length).toBe(2);

    const merged = deduplicated.find((s) => s.accessionNumber === 'ACC-2026-001')!;
    expect(merged).toBeDefined();
    expect(merged.numSeries).toBe(4);
    expect(merged.numInstances).toBe(480);
  });

  it('correlates PACS studies with local worklist records', () => {
    const localRecords = [
      { id: 'local-study-1', accessionNumber: 'ACC-2026-001', status: 'final' },
    ];

    const correlated = correlateWithLocalWorklist(sampleStudies, localRecords);
    expect(correlated.length).toBe(3);

    const importedStudy = correlated.find((s) => s.accessionNumber === 'ACC-2026-001')!;
    expect(importedStudy.isImported).toBe(true);
    expect(importedStudy.localStatus).toBe('final');
    expect(importedStudy.localStudyId).toBe('local-study-1');

    const pendingStudy = correlated.find((s) => s.accessionNumber === 'ACC-2026-002')!;
    expect(pendingStudy.isImported).toBe(false);
    expect(pendingStudy.localStatus).toBeUndefined();
  });

  it('manages in-flight import concurrency locks', () => {
    expect(acquireImportLock('ACC-LOCK-1')).toBe(true);
    // Second lock attempt for same accession while in flight must fail
    expect(acquireImportLock('acc-lock-1')).toBe(false);

    releaseImportLock('ACC-LOCK-1');
    // Once released, lock can be acquired again
    expect(acquireImportLock('ACC-LOCK-1')).toBe(true);
    releaseImportLock('ACC-LOCK-1');
  });
});
