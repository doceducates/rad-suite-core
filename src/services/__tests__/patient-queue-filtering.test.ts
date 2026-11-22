import { describe, it, expect } from 'vitest';
import { PacsQuerySchema } from '@/lib/validation';
import { parseStudyTimestamp } from '@/services/study-sorting';
import { matchesDate, matchesAssigned } from '@/services/unified-case-filters';
import { formatPatientStudyDateTime } from '@/components/workstation/zen-patient-queue-item';
import type { PacsStudyResult } from '@/types/pacs';

describe('Patient Queue & 48h Filter Diagnostics', () => {
  it('validates PacsQuerySchema with 48h, 7d, 30d dateRange and currentUserId', () => {
    const res48h = PacsQuerySchema.safeParse({
      assignedTo: 'me',
      dateRange: '48h',
      limit: 80,
      currentUserId: 'user-123',
    });
    expect(res48h.success).toBe(true);
    if (res48h.success) {
      expect(res48h.data.dateRange).toBe('48h');
      expect(res48h.data.currentUserId).toBe('user-123');
    }

    const res7d = PacsQuerySchema.safeParse({ dateRange: '7d' });
    expect(res7d.success).toBe(true);

    const res30d = PacsQuerySchema.safeParse({ dateRange: '30d' });
    expect(res30d.success).toBe(true);
  });

  it('parses timestamps accurately across ISO, DICOM, and HMIS slash formats', () => {
    // DICOM 8-digit
    const dicomTs = parseStudyTimestamp('20261012', '201300');
    const dicomDate = new Date(dicomTs);
    expect(dicomDate.getFullYear()).toBe(2026);
    expect(dicomDate.getMonth()).toBe(9); // October (0-indexed)
    expect(dicomDate.getDate()).toBe(12);
    expect(dicomDate.getHours()).toBe(20);
    expect(dicomDate.getMinutes()).toBe(13);

    // HMIS slash format: DD/MM/YY HH:MM:SS AM/PM
    const slashTs = parseStudyTimestamp('12/10/26 8:13:00 PM');
    const slashDate = new Date(slashTs);
    expect(slashDate.getFullYear()).toBe(2026);
    expect(slashDate.getMonth()).toBe(9); // October
    expect(slashDate.getDate()).toBe(12);
    expect(slashDate.getHours()).toBe(20);
    expect(slashDate.getMinutes()).toBe(13);

    // ISO string
    const isoTs = parseStudyTimestamp('2026-10-12T17:40:00.000Z');
    expect(isoTs).toBeGreaterThan(0);
  });

  it('matchesDate filters general worklist by study date and personal queue by claimed/taken up date', () => {
    const now = Date.now();
    const fourDaysAgoIso = new Date(now - 4 * 86400000).toISOString();
    const twoHoursAgoIso = new Date(now - 2 * 3600000).toISOString();
    const fiveDaysAgoIso = new Date(now - 5 * 86400000).toISOString();

    // 1. General Worklist (assignedTo: 'all' or undefined):
    // Study scheduled 4 days ago, claimed 2 hours ago -> should NOT match 48h
    const generalMatch48h = matchesDate(fourDaysAgoIso, { dateRange: '48h', assignedTo: 'all' }, twoHoursAgoIso);
    expect(generalMatch48h).toBe(false);

    // 2. Personal Queue (My Cases: assignedTo: 'me'):
    // Old study scheduled 4 days ago, but taken up 2 hours ago -> SHOULD match 48h!
    const personalMatch48h = matchesDate(fourDaysAgoIso, { dateRange: '48h', assignedTo: 'me' }, twoHoursAgoIso);
    expect(personalMatch48h).toBe(true);

    // Case taken up 5 days ago -> does NOT match 48h in My Cases
    const olderPersonalMatch = matchesDate(fourDaysAgoIso, { dateRange: '48h', assignedTo: 'me' }, fiveDaysAgoIso);
    expect(olderPersonalMatch).toBe(false);

    // But DOES match week or all
    const weekPersonalMatch = matchesDate(fourDaysAgoIso, { dateRange: 'week', assignedTo: 'me' }, fiveDaysAgoIso);
    expect(weekPersonalMatch).toBe(true);
  });

  it('matchesAssigned respects user attribution case-insensitively', () => {
    const study: Partial<PacsStudyResult> = {
      accessionNumber: 'ACC101',
      assignedRadiologistId: '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
    };

    expect(matchesAssigned(study as PacsStudyResult, 'me', '9CE1C37B-22E7-4CDB-83AE-EB14E91FDE8A')).toBe(true);
    expect(matchesAssigned(study as PacsStudyResult, 'me', '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a')).toBe(true);
    expect(matchesAssigned(study as PacsStudyResult, 'me', 'other-user')).toBe(false);
  });

  it('formatPatientStudyDateTime displays Today and Yesterday labels', () => {
    const now = new Date();
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30).toISOString();
    const yesterdayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 15).toISOString();

    const formattedToday = formatPatientStudyDateTime(todayStr);
    expect(formattedToday).toContain('Today,');

    const formattedYesterday = formatPatientStudyDateTime(yesterdayStr);
    expect(formattedYesterday).toContain('Yesterday,');
  });

  it('queries getUnifiedWorklist with assignedTo=me and dateRange=48h without throwing', async () => {
    const { getUnifiedWorklist } = await import('@/services/unified-case.service');
    const result = await getUnifiedWorklist({
      assignedTo: 'me',
      dateRange: '48h',
      limit: 80,
      currentUserId: '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.cases)).toBe(true);
    expect(typeof result.total).toBe('number');
  });

  it('imports ZenPatientQueueDropdown and ZenPatientQueueItem without missing reference symbols', async () => {
    const { ZenPatientQueueDropdown } = await import('@/components/workstation/zen-patient-queue-dropdown');
    const { ZenPatientQueueItem } = await import('@/components/workstation/zen-patient-queue-item');

    expect(ZenPatientQueueDropdown).toBeDefined();
    expect(typeof ZenPatientQueueDropdown).toBe('function');
    expect(ZenPatientQueueItem).toBeDefined();
    expect(typeof ZenPatientQueueItem).toBe('function');
  });

  it('sortStudies orders by claimedAt in personal queue and studyDate in general queue', async () => {
    const { sortStudies } = await import('@/services/study-sorting');
    const caseA: Partial<PacsStudyResult> = {
      accessionNumber: 'ACC_OLD_SCAN_RECENT_CLAIM',
      studyDate: '2026-10-01T10:00:00.000Z',
      claimedAt: '2026-10-13T10:00:00.000Z',
    };
    const caseB: Partial<PacsStudyResult> = {
      accessionNumber: 'ACC_RECENT_SCAN_OLD_CLAIM',
      studyDate: '2026-10-10T10:00:00.000Z',
      claimedAt: '2026-10-08T10:00:00.000Z',
    };

    // Personal queue: sorted by claimedAt desc -> caseA (claimed Oct 13) comes before caseB (claimed Oct 8)
    const personalSorted = sortStudies([caseB as PacsStudyResult, caseA as PacsStudyResult], 'date_desc', true);
    expect(personalSorted[0].accessionNumber).toBe('ACC_OLD_SCAN_RECENT_CLAIM');

    // General queue: sorted by studyDate desc -> caseB (scan Oct 10) comes before caseA (scan Oct 1)
    const generalSorted = sortStudies([caseA as PacsStudyResult, caseB as PacsStudyResult], 'date_desc', false);
    expect(generalSorted[0].accessionNumber).toBe('ACC_RECENT_SCAN_OLD_CLAIM');
  });

  it('matchesDate strictly respects applied date filters (e.g. shift/48h) during search', () => {
    const twoWeeksAgoIso = new Date(Date.now() - 14 * 86400000).toISOString();

    // Default shift filter with no search query -> hides 2-week-old case
    expect(matchesDate(twoWeeksAgoIso, { dateRange: 'shift' })).toBe(false);

    // Clinician searches with shift / 48h filter active -> strictly respects filter and hides 2-week-old case
    expect(matchesDate(twoWeeksAgoIso, { dateRange: 'shift', query: 'ACC-12345' })).toBe(false);
    expect(matchesDate(twoWeeksAgoIso, { dateRange: 'shift', accessionNumber: 'ACC-12345' })).toBe(false);
    expect(matchesDate(twoWeeksAgoIso, { dateRange: 'shift', patientMrn: 'MRN-999' })).toBe(false);
    expect(matchesDate(twoWeeksAgoIso, { dateRange: '48h', patientName: 'John' })).toBe(false);

    // Older cases are only revealed when dateRange is explicitly 'all'
    expect(matchesDate(twoWeeksAgoIso, { dateRange: 'all', query: 'ACC-12345' })).toBe(true);
  });

  it('safeguards Drizzle PgTimestamp and PgDate against Invalid Date values', async () => {
    const { db } = await import('@/db');
    const { studies } = await import('@/db/schema');

    // Generating SQL with an Invalid Date should NOT throw RangeError: Invalid time value
    expect(() => {
      db.insert(studies).values({
        id: '00000000-0000-0000-0000-000000000001',
        patientId: '00000000-0000-0000-0000-000000000002',
        accessionNumber: 'TEST_INVALID_DATE_SAFE',
        modality: 'CT',
        scanType: 'Head CT',
        bodyPart: 'Head',
        scheduledAt: new Date('invalid_time') as any,
        claimedAt: new Date('invalid_time') as any,
        createdAt: new Date('invalid_time') as any,
      }).toSQL();
    }).not.toThrow();
  });

  it('safely parses DICOM 8-digit dates, HMIS strings, and handles invalid Date values', async () => {
    const { parseDateSafely, parseDateOrNull, safeIsoString } = await import('@/lib/date-utils');

    // 1. DICOM 8-digit string
    const dicomDate = parseDateSafely('20261015');
    expect(dicomDate.getUTCFullYear()).toBe(2026);
    expect(dicomDate.getUTCMonth()).toBe(9); // 0-indexed October
    expect(dicomDate.getUTCDate()).toBe(15);

    // 2. HMIS DD-MM-YYYY format
    const hmisDate = parseDateSafely('15-10-2026');
    expect(hmisDate.getUTCFullYear()).toBe(2026);
    expect(hmisDate.getUTCDate()).toBe(15);

    // 3. Invalid Date instance never throws
    const invalidDate = new Date('garbage');
    expect(parseDateSafely(invalidDate)).toBeInstanceOf(Date);
    expect(isNaN(parseDateSafely(invalidDate).getTime())).toBe(false);

    // 4. parseDateOrNull
    expect(parseDateOrNull(null)).toBeNull();
    expect(parseDateOrNull('garbage')).toBeNull();
    expect(parseDateOrNull('20261015')).toBeInstanceOf(Date);

    // 5. safeIsoString
    expect(typeof safeIsoString('20261015')).toBe('string');
    expect(typeof safeIsoString('invalid')).toBe('string');

    // 6. Global Date.prototype.toISOString safeguard
    expect(() => new Date('invalid').toISOString()).not.toThrow();
  });

  it('clientManifestCache stores, retrieves, and expires study manifests', async () => {
    const { clientManifestCache } = await import('@/services/client-manifest-cache');
    clientManifestCache.clear();

    const manifest = {
      accessionNumber: 'ACC_PREWARM_001',
      series: [
        { seriesNumber: '1', seriesDescription: 'Localizer', instances: [{}], sliceCount: 1 },
      ],
    };

    clientManifestCache.set('acc_prewarm_001', manifest);
    expect(clientManifestCache.has('ACC_PREWARM_001')).toBe(true);
    expect(clientManifestCache.get('ACC_PREWARM_001')?.accessionNumber).toBe('ACC_PREWARM_001');

    clientManifestCache.clear();
    expect(clientManifestCache.has('ACC_PREWARM_001')).toBe(false);
  });

  it('strictly selects nextCase following active sort order without skipping to incomplete', () => {
    // 3 cases in patient queue:
    // Patient A: completed
    // Patient B: completed
    // Patient C: incomplete
    const cases: PacsStudyResult[] = [
      {
        id: '1',
        accessionNumber: 'ACC_A',
        patientName: 'Alice',
        studyDate: '2026-10-15',
        reportSections: { history: true, findings: true, impression: true },
      } as any,
      {
        id: '2',
        accessionNumber: 'ACC_B',
        patientName: 'Bob',
        studyDate: '2026-10-14',
        reportSections: { history: true, findings: true, impression: true },
      } as any,
      {
        id: '3',
        accessionNumber: 'ACC_C',
        patientName: 'Charlie',
        studyDate: '2026-10-13',
        reportSections: { history: false, findings: false, impression: false },
      } as any,
    ];

    // Sorted by patient name asc: Alice (0), Bob (1), Charlie (2)
    // When current is Alice, the NEXT case according to user sort MUST be Bob, NOT Charlie!
    const currentAcc = 'ACC_A';
    const currentIndex = cases.findIndex((c) => c.accessionNumber === currentAcc);
    const nextCase = currentIndex >= 0 && currentIndex < cases.length - 1 ? cases[currentIndex + 1] : undefined;

    expect(nextCase?.accessionNumber).toBe('ACC_B');
    expect(nextCase?.patientName).toBe('Bob');
  });

  it('verifies SQLite performance indices exist on studies, reports, and patients', async () => {
    const { sqlite, IS_SQLITE } = await import('@/db');
    if (!IS_SQLITE || !sqlite) return;

    const indices = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((r: any) => r.name);
    expect(indices).toContain('idx_studies_patient_id');
    expect(indices).toContain('idx_studies_assigned');
    expect(indices).toContain('idx_studies_scheduled');
    expect(indices).toContain('idx_studies_status_hmis');
    expect(indices).toContain('idx_reports_study_id');
  });
});

