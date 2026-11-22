import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { consolidatePatientStudies } from '../unified-case-grouping';
import { markCompanionStudies } from '../unified-case-stats';
import { matchesDate, matchesStatus } from '../unified-case-filters';
import { getUnifiedWorklist } from '../unified-case.service';
import type { PacsStudyResult } from '@/types/pacs';

describe('Patient Encounter Grouping & Prior Studies Invariants (Adeeba Clinical Case)', () => {
  const testPatientId = 'adeeba-test-patient-uuid-001';
  const cervicalStudyId = 'adeeba-cervical-study-uuid-001';
  const lumbarStudyId = 'adeeba-lumbar-study-uuid-002';

  const adeebaCervicalPrior: PacsStudyResult = {
    accessionNumber: '192610008299',
    patientName: 'Adeeba',
    patientMrn: '19202655305562',
    patientId: '19202655305562',
    age: 11,
    gender: 'Female',
    modality: 'MRI',
    studyDescription: 'MRI Cervical Spine Without Contrast',
    studyDate: '2026-10-31T19:55:37.000Z', // 3 weeks ago
    status: 'final',
    priority: 'routine',
    reportId: 'rep-cervical-final',
    numSeries: 4,
    numInstances: 120,
    pacsServerAe: 'LOCAL',
    studyInstanceUid: '1.2.840.192610008299',
    isFilmCharges: false,
  };

  const adeebaFilmCharges: PacsStudyResult = {
    accessionNumber: '192611001174',
    patientName: 'Adeeba',
    patientMrn: '19202655305562',
    patientId: '19202655305562',
    age: 11,
    gender: 'Female',
    modality: 'MRI',
    studyDescription: 'MRI Film Charges',
    studyDate: '2026-11-04T07:53:00.000Z', // Billed 4 days later
    status: 'scheduled',
    priority: 'routine',
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'LOCAL',
    studyInstanceUid: '1.2.840.192611001174',
    isFilmCharges: true,
  };

  const adeebaLumbarActive: PacsStudyResult = {
    accessionNumber: '192611007781',
    patientName: 'Adeeba',
    patientMrn: '19202655305562',
    patientId: '19202655305562',
    age: 11,
    gender: 'Female',
    modality: 'MRI',
    studyDescription: 'MRI Lumbosacral Spine Without Contrast',
    studyDate: '2026-11-20T19:24:58.000Z', // Yesterday
    status: 'scheduled',
    priority: 'routine',
    numSeries: 5,
    numInstances: 150,
    pacsServerAe: 'LOCAL',
    studyInstanceUid: '1.2.840.192611007781',
    isFilmCharges: false,
  };

  beforeAll(async () => {
    try {
      await db.delete(studies).where(inArray(studies.accessionNumber, ['192610008299', '192611007781']));
      await db.delete(studies).where(eq(studies.patientId, testPatientId));
      await db.delete(patients).where(eq(patients.mrNumber, '19202655305562'));
    } catch {}

    await db.insert(patients).values({
      id: testPatientId,
      mrNumber: '19202655305562',
      fullName: 'Adeeba',
      age: 11,
      gender: 'Female',
    });

    await db.insert(studies).values([
      {
        id: cervicalStudyId,
        patientId: testPatientId,
        accessionNumber: '192610008299',
        modality: 'MRI',
        scanType: 'MRI Cervical Spine Without Contrast',
        bodyPart: 'Cervical Spine',
        status: 'final' as const,
        priority: 'routine' as const,
        scheduledAt: new Date('2026-10-31T19:55:37.000Z'),
        hmisStatus: 'published',
        hmisInvestigationId: 'inv-cervical-101',
      },
      {
        id: lumbarStudyId,
        patientId: testPatientId,
        accessionNumber: '192611007781',
        modality: 'MRI',
        scanType: 'MRI Lumbosacral Spine Without Contrast',
        bodyPart: 'Lumbosacral Spine',
        status: 'scheduled' as const,
        priority: 'routine' as const,
        scheduledAt: new Date('2026-11-20T19:24:58.000Z'),
        hmisStatus: 'awaiting_report',
        hmisInvestigationId: 'inv-lumbar-102',
      },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(studies).where(inArray(studies.accessionNumber, ['192610008299', '192611007781']));
      await db.delete(studies).where(eq(studies.patientId, testPatientId));
      await db.delete(patients).where(eq(patients.mrNumber, '19202655305562'));
    } catch {}
  });

  it('keeps studies across different dates as separate encounters instead of collapsing them', () => {
    const results = consolidatePatientStudies([adeebaCervicalPrior, adeebaFilmCharges, adeebaLumbarActive], true);

    // Should return 2 distinct encounters: October 31 (Cervical) and November 20 (Lumbar)
    expect(results).toHaveLength(2);

    const lumbarEncounter = results.find((r) => r.accessionNumber === '192611007781');
    const cervicalEncounter = results.find((r) => r.accessionNumber === '192610008299');

    expect(lumbarEncounter).toBeDefined();
    expect(cervicalEncounter).toBeDefined();

    // Lumbar encounter is active (scheduled)
    expect(lumbarEncounter!.status).toBe('scheduled');
    expect(lumbarEncounter!.studyDescription).toBe('MRI Lumbosacral Spine Without Contrast');

    // Cervical encounter is completed (final)
    expect(cervicalEncounter!.status).toBe('final');
    expect(cervicalEncounter!.studyDescription).toBe('MRI Cervical Spine Without Contrast');
  });

  it('populates priorStudies on the active encounter referencing earlier diagnostic scans', () => {
    const results = consolidatePatientStudies([adeebaCervicalPrior, adeebaFilmCharges, adeebaLumbarActive], true);

    const lumbarEncounter = results.find((r) => r.accessionNumber === '192611007781')!;
    expect(lumbarEncounter.priorStudies).toBeDefined();
    expect(lumbarEncounter.priorStudies).toHaveLength(1);

    const prior = lumbarEncounter.priorStudies![0];
    expect(prior.accessionNumber).toBe('192610008299');
    expect(prior.studyDescription).toBe('MRI Cervical Spine Without Contrast');
    expect(prior.status).toBe('final');
    expect(prior.reportId).toBe('rep-cervical-final');

    // Companion studies should be empty because there were no other scans on Nov 20
    expect(lumbarEncounter.companionStudies).toEqual([]);
    expect(lumbarEncounter.isMultiStudy).toBe(false);
  });

  it('guarantees active new study is visible in Reporting Queue and matches relative date filter', () => {
    const results = consolidatePatientStudies([adeebaCervicalPrior, adeebaFilmCharges, adeebaLumbarActive], true);

    const lumbarEncounter = results.find((r) => r.accessionNumber === '192611007781')!;
    const cervicalEncounter = results.find((r) => r.accessionNumber === '192610008299')!;

    // 1. Status Filter: Reporting Queue filters by status = 'scheduled'
    expect(matchesStatus(lumbarEncounter, 'scheduled')).toBe(true);
    expect(matchesStatus(cervicalEncounter, 'scheduled')).toBe(false); // Oct 31 is final, excluded from queue

    // 2. Published & Priors filters by status = 'final'
    expect(matchesStatus(cervicalEncounter, 'final')).toBe(true);
    expect(matchesStatus(lumbarEncounter, 'final')).toBe(false);
  });

  it('prioritizes unread/scheduled studies over completed studies in the same encounter', () => {
    const morningStudy: PacsStudyResult = {
      accessionNumber: '192611009001',
      patientName: 'Test Patient',
      patientMrn: 'MRN-SAME-DAY',
      modality: 'MRI',
      studyDescription: 'MRI Brain',
      studyDate: '2026-11-20T08:00:00.000Z',
      status: 'final', // Already reported in morning shift
      priority: 'routine',
      isFilmCharges: false,
      numSeries: 2,
      numInstances: 50,
      pacsServerAe: 'LOCAL',
      studyInstanceUid: '1.2.9001',
      age: 25,
      gender: 'Male',
    };

    const afternoonStudy: PacsStudyResult = {
      accessionNumber: '192611009002',
      patientName: 'Test Patient',
      patientMrn: 'MRN-SAME-DAY',
      modality: 'MRI',
      studyDescription: 'MRI Cervical Spine',
      studyDate: '2026-11-20T14:00:00.000Z',
      status: 'scheduled', // Just scanned, awaiting report
      priority: 'routine',
      isFilmCharges: false,
      numSeries: 3,
      numInstances: 80,
      pacsServerAe: 'LOCAL',
      studyInstanceUid: '1.2.9002',
      age: 25,
      gender: 'Male',
    };

    // Both are same day (6 hours apart): consolidate into 1 encounter
    const consolidated = consolidatePatientStudies([morningStudy, afternoonStudy], true);

    expect(consolidated).toHaveLength(1);
    const parent = consolidated[0];

    // Primary representation MUST be the active scheduled study, not the completed one!
    expect(parent.accessionNumber).toBe('192611009002');
    expect(parent.status).toBe('scheduled');
    expect(parent.isMultiStudy).toBe(true);
    expect(parent.companionStudies).toHaveLength(1);
    expect(parent.companionStudies![0].accessionNumber).toBe('192611009001');
  });

  it('markCompanionStudies marks same-day scans as companions and older scans as priors', () => {
    const list = [adeebaCervicalPrior, adeebaLumbarActive];
    markCompanionStudies(list);

    // Lumbar scan should have priorStudies with the cervical scan, but NO companion studies
    expect(adeebaLumbarActive.priorStudies).toBeDefined();
    expect(adeebaLumbarActive.priorStudies).toHaveLength(1);
    expect(adeebaLumbarActive.priorStudies![0].accessionNumber).toBe('192610008299');
    expect(adeebaLumbarActive.companionStudies).toBeUndefined();

    // Cervical scan has no priors and no companions
    expect(adeebaCervicalPrior.priorStudies).toBeUndefined();
    expect(adeebaCervicalPrior.companionStudies).toBeUndefined();
  });

  it('getUnifiedWorklist returns both encounters when querying patient history', async () => {
    const res = await getUnifiedWorklist({ query: '19202655305562', dateRange: 'all' });
    expect(res.cases.length).toBeGreaterThanOrEqual(2);

    const lumbar = res.cases.find((c) => c.accessionNumber === '192611007781');
    const cervical = res.cases.find((c) => c.accessionNumber === '192610008299');
    expect(lumbar).toBeDefined();
    expect(cervical).toBeDefined();
    expect(lumbar?.priorStudies?.some((p) => p.accessionNumber === '192610008299')).toBe(true);
  });

  it('guarantees Adeeba lumbar scan appears in active scheduled Reporting Queue', async () => {
    const res = await getUnifiedWorklist({ dateRange: 'all', status: 'scheduled' });
    const lumbar = res.cases.find((c) => c.accessionNumber === '192611007781');
    expect(lumbar).toBeDefined();
    expect(lumbar?.status).toBe('scheduled');
    expect(lumbar?.studyDescription).toContain('Lumbosacral');
  });
});
