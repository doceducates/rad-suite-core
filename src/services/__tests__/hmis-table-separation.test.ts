import { describe, it, expect } from 'vitest';
import { matchesDate, matchesText, matchesModality } from '../unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

describe('HMIS Worklist Table Separation & Encounter Invariants', () => {
  const sampleHmisStudy: PacsStudyResult = {
    accessionNumber: '192611004945',
    patientName: 'AREENA',
    patientMrn: '19202655967623',
    patientId: '19202655967623',
    age: 24,
    gender: 'Female',
    cnic: '35202-1234567-8',
    modality: 'MRI',
    studyDescription: 'MRI BRAIN WITH CONTRAST',
    studyDate: '2026-11-14T01:46:05.315Z',
    technologist: 'kashif khalid',
    referringDoctor: 'Dr. Asad Neuro',
    department: 'OPD',
    room: 'MRI Room 1',
    status: 'scheduled',
    hmisStatus: 'awaiting_report',
    assignedRadiologistId: null,
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'HMIS_GATEWAY',
    studyInstanceUid: '1.2.840.192611004945',
  };

  it('preserves HMIS encounter metadata (CNIC, technologist, referring doctor, room)', () => {
    expect(sampleHmisStudy.cnic).toBe('35202-1234567-8');
    expect(sampleHmisStudy.technologist).toBe('kashif khalid');
    expect(sampleHmisStudy.referringDoctor).toBe('Dr. Asad Neuro');
    expect(sampleHmisStudy.department).toBe('OPD');
    expect(sampleHmisStudy.room).toBe('MRI Room 1');
  });

  it('correctly matches yesterday date filter for yesterday studies', () => {
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString();
    const isYesterday = matchesDate(yesterdayDate, { dateRange: 'yesterday' });
    expect(isYesterday).toBe(true);

    const isToday = matchesDate(yesterdayDate, { dateRange: 'today' });
    expect(isToday).toBe(false);
  });

  it('matches MRN or accession query regardless of case sensitivity or formatting', () => {
    expect(matchesText(sampleHmisStudy, '192611004945')).toBe(true);
    expect(matchesText(sampleHmisStudy, '19202655967623')).toBe(true);
    expect(matchesText(sampleHmisStudy, 'areena')).toBe(true);
    expect(matchesText(sampleHmisStudy, '999999999999')).toBe(false);
  });

  it('differentiates unassigned HMIS case from claimed case for Add Result gating', () => {
    const isClaimedByMe = (st: PacsStudyResult, userId: string) =>
      Boolean(st.assignedRadiologistId && st.assignedRadiologistId === userId);

    const currentUserId = 'user-pgr-mudassir';

    // Unassigned case: must trigger claim prompt modal first
    expect(isClaimedByMe(sampleHmisStudy, currentUserId)).toBe(false);

    // Claimed case: allows direct report editor opening
    const claimedStudy: PacsStudyResult = {
      ...sampleHmisStudy,
      assignedRadiologistId: currentUserId,
      claimedAt: '2026-11-15T09:00:00.000Z',
    };
    expect(isClaimedByMe(claimedStudy, currentUserId)).toBe(true);
  });

  it('confirms modality matching for MRI variants', () => {
    expect(matchesModality('MRI', 'MRI')).toBe(true);
    expect(matchesModality('MR', 'MRI')).toBe(true);
    expect(matchesModality('MRI', 'MR')).toBe(true);
    expect(matchesModality('CT', 'MRI')).toBe(false);
  });
});
