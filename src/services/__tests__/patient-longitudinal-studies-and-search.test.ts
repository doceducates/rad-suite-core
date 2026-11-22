import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db';
import { studies, patients, reports } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { resolveWorkspaceCase } from '@/services/workspace-case-resolver.service';
import { getUnifiedWorklist } from '@/services/unified-case.service';
import { matchesFilmCharges, matchesDate } from '@/services/unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

describe('Patient Longitudinal Encounters, Smart Search & Workspace Resolution', () => {
  const patientId = 'pt-adeeba-test-uuid';
  const mrn = '19202655305562';
  const priorAcc = '192610008299';
  const currentAcc = '192611007781';

  beforeEach(async () => {
    vi.restoreAllMocks();
    // Clean up test records
    await db.delete(studies).where(or(eq(studies.accessionNumber, priorAcc), eq(studies.accessionNumber, currentAcc)));
    await db.delete(patients).where(eq(patients.id, patientId));

    // Seed test patient
    await db.insert(patients).values({
      id: patientId,
      mrNumber: mrn,
      fullName: 'Adeeba Test',
      age: 11,
      gender: 'Female',
      dob: '2015-10-31',
      tenantId: 'tnt_lgh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    // Seed prior study (Oct 31)
    await db.insert(studies).values({
      id: 'std-prior-uuid',
      patientId,
      accessionNumber: priorAcc,
      modality: 'MRI',
      scanType: 'MRI Cervical Spine Without Contrast',
      bodyPart: 'Cervical Spine',
      scheduledAt: '2026-10-31T19:55:37.000Z',
      status: 'final',
      priority: 'routine',
      tenantId: 'tnt_lgh',
      createdAt: '2026-10-31T20:00:00.000Z',
      updatedAt: '2026-10-31T20:00:00.000Z',
    } as any);

    // Seed current study (Nov 20)
    await db.insert(studies).values({
      id: 'std-current-uuid',
      patientId,
      accessionNumber: currentAcc,
      modality: 'MRI',
      scanType: 'MRI Lumbosacral Spine Without Contrast',
      bodyPart: 'LS Spine',
      scheduledAt: '2026-11-20T19:24:58.000Z',
      status: 'in-progress',
      priority: 'routine',
      tenantId: 'tnt_lgh',
      createdAt: '2026-11-20T19:30:00.000Z',
      updatedAt: '2026-11-20T19:30:00.000Z',
    } as any);
  });

  it('exposes newerStudies when viewing an older study and priorStudies when viewing a newer study', async () => {
    // 1. Viewing the older study: must detect newer study (Nov 20)
    const resolvedOlder = await resolveWorkspaceCase(priorAcc);
    expect(resolvedOlder).toBeDefined();
    expect(resolvedOlder?.study.accessionNumber).toBe(priorAcc);
    expect(resolvedOlder?.study.newerStudies).toBeDefined();
    expect(resolvedOlder?.study.newerStudies.length).toBe(1);
    expect(resolvedOlder?.study.newerStudies[0].accessionNumber).toBe(currentAcc);
    expect(resolvedOlder?.study.newerStudies[0].studyDescription).toContain('Lumbosacral Spine');

    // 2. Viewing the newer study: must detect prior study (Oct 31)
    const resolvedNewer = await resolveWorkspaceCase(currentAcc);
    expect(resolvedNewer).toBeDefined();
    expect(resolvedNewer?.study.accessionNumber).toBe(currentAcc);
    expect(resolvedNewer?.study.priorStudies).toBeDefined();
    expect(resolvedNewer?.study.priorStudies.length).toBe(1);
    expect(resolvedNewer?.study.priorStudies[0].accessionNumber).toBe(priorAcc);
    expect(resolvedNewer?.study.priorStudies[0].studyDescription).toContain('Cervical Spine');
  });

  it('resolves directly to the active/most recent study when given a patient MRN', async () => {
    const resolvedByMrn = await resolveWorkspaceCase(mrn);
    expect(resolvedByMrn).toBeDefined();
    // In-progress study (currentAcc) takes priority over finalized older study (priorAcc)
    expect(resolvedByMrn?.study.accessionNumber).toBe(currentAcc);
    expect(resolvedByMrn?.patient.fullName).toBe('Adeeba Test');
    expect(resolvedByMrn?.study.priorStudies.length).toBe(1);
    expect(resolvedByMrn?.study.priorStudies[0].accessionNumber).toBe(priorAcc);
  });

  it('performs smart search across all dates when query has 0 results under relative date preset', async () => {
    // Both studies are outside "today" (Nov 21)
    const result = await getUnifiedWorklist({
      query: 'Adeeba Test',
      dateRange: 'today',
    });

    // Smart search fallback automatically surfaces the examinations across all dates
    expect(result.total).toBeGreaterThanOrEqual(1);
    const foundAccs = result.cases.map((c) => c.accessionNumber);
    expect(foundAccs).toContain(currentAcc);
  });

  it('bypasses date filter immediately for exact identifier searches (MRN or Accession)', async () => {
    const resByAcc = await getUnifiedWorklist({
      accessionNumber: currentAcc,
      dateRange: 'today',
    });
    expect(resByAcc.cases.some((c) => c.accessionNumber === currentAcc)).toBe(true);

    const resByMrn = await getUnifiedWorklist({
      query: mrn,
      dateRange: 'today',
    });
    expect(resByMrn.cases.some((c) => c.patientMrn === mrn || c.patientId === mrn)).toBe(true);
  });

  it('strictly hides film charges unless Bills filter is enabled or directly searched', () => {
    const filmStudy = {
      accessionNumber: '192611009999',
      patientName: 'Adeeba Test',
      studyDescription: 'MRI Film Charges',
      isFilmCharges: true,
      modality: 'MR',
      status: 'scheduled',
      priority: 'routine',
    } as any as PacsStudyResult;

    // Default: hidden
    expect(matchesFilmCharges(filmStudy, true, false)).toBe(false);

    // Bills button enabled (hideFilmCharges === false): visible
    expect(matchesFilmCharges(filmStudy, false, false)).toBe(true);

    // Directly targeted by accession: visible
    expect(matchesFilmCharges(filmStudy, true, true, '192611009999')).toBe(true);
  });
});
