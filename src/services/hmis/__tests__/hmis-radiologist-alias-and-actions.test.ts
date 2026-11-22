import { describe, it, expect } from 'vitest';
import { isSameRadiologistUser, matchesAssigned } from '@/services/unified-case-filters';
import type { PacsStudyResult } from '@/types/pacs';

describe('Radiologist User ID Dual-Alias & Row Action Authorization Tests', () => {
  const localAdminId = 'usr_admin_mudassir';
  const vpsUuid = '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a';
  const hyphenatedAlias = 'usr-admin-mudassir';
  const otherUserId = 'usr_resident_01';

  it('correctly matches Dr. Mudassir across local ID, cloud VPS UUID, and hyphenated variants', () => {
    // 1. Exact matches
    expect(isSameRadiologistUser(localAdminId, localAdminId)).toBe(true);
    expect(isSameRadiologistUser(vpsUuid, vpsUuid)).toBe(true);

    // 2. Cross-environment alias matches (VPS UUID vs local ID)
    expect(isSameRadiologistUser(vpsUuid, localAdminId)).toBe(true);
    expect(isSameRadiologistUser(localAdminId, vpsUuid)).toBe(true);

    // 3. Case-insensitive and hyphenated alias matches
    expect(isSameRadiologistUser(hyphenatedAlias, localAdminId)).toBe(true);
    expect(isSameRadiologistUser(localAdminId.toUpperCase(), vpsUuid)).toBe(true);

    // 4. Different users must NEVER match
    expect(isSameRadiologistUser(otherUserId, localAdminId)).toBe(false);
    expect(isSameRadiologistUser(vpsUuid, otherUserId)).toBe(false);
    expect(isSameRadiologistUser(null, localAdminId)).toBe(false);
    expect(isSameRadiologistUser(undefined, localAdminId)).toBe(false);
    expect(isSameRadiologistUser(localAdminId, undefined)).toBe(false);
  });

  it('matchesAssigned correctly resolves filterAssigned="me" for both local ID and VPS UUID', () => {
    const studyFromVps: Partial<PacsStudyResult> = {
      accessionNumber: '192611005819',
      assignedRadiologistId: vpsUuid,
    };
    const studyCreatedLocally: Partial<PacsStudyResult> = {
      accessionNumber: '192611005992',
      assignedRadiologistId: localAdminId,
    };
    const studyOfOtherDoctor: Partial<PacsStudyResult> = {
      accessionNumber: '192611001234',
      assignedRadiologistId: otherUserId,
    };

    // When logged in as localAdminId:
    expect(matchesAssigned(studyFromVps as PacsStudyResult, 'me', localAdminId)).toBe(true);
    expect(matchesAssigned(studyCreatedLocally as PacsStudyResult, 'me', localAdminId)).toBe(true);
    expect(matchesAssigned(studyOfOtherDoctor as PacsStudyResult, 'me', localAdminId)).toBe(false);

    // When logged in as vpsUuid:
    expect(matchesAssigned(studyFromVps as PacsStudyResult, 'me', vpsUuid)).toBe(true);
    expect(matchesAssigned(studyCreatedLocally as PacsStudyResult, 'me', vpsUuid)).toBe(true);
    expect(matchesAssigned(studyOfOtherDoctor as PacsStudyResult, 'me', vpsUuid)).toBe(false);
  });

  it('evaluates WorklistRowActions authorization logic so HMIS button is available on My Cases and claimed studies', () => {
    // Pure logic simulation of WorklistRowActions isTakenUpByMe
    function computeIsTakenUpByMe(options: {
      isMyCases: boolean;
      assignedRadiologistId?: string | null;
      currentUserId?: string | null;
    }): boolean {
      return Boolean(
        options.isMyCases ||
        isSameRadiologistUser(options.assignedRadiologistId, options.currentUserId)
      );
    }

    // Scenario 1: On My Cases page (isMyCases = true)
    // The HMIS button MUST be unlocked for every case, even if synced with VPS UUID
    expect(
      computeIsTakenUpByMe({
        isMyCases: true,
        assignedRadiologistId: vpsUuid,
        currentUserId: localAdminId,
      })
    ).toBe(true);

    expect(
      computeIsTakenUpByMe({
        isMyCases: true,
        assignedRadiologistId: localAdminId,
        currentUserId: localAdminId,
      })
    ).toBe(true);

    // Scenario 2: On General Hospital Worklist (isMyCases = false)
    // HMIS button is enabled if claimed by current user (handling VPS alias)
    expect(
      computeIsTakenUpByMe({
        isMyCases: false,
        assignedRadiologistId: vpsUuid,
        currentUserId: localAdminId,
      })
    ).toBe(true);

    // HMIS button is blocked if claimed by another doctor
    expect(
      computeIsTakenUpByMe({
        isMyCases: false,
        assignedRadiologistId: otherUserId,
        currentUserId: localAdminId,
      })
    ).toBe(false);

    // HMIS button is blocked if unassigned
    expect(
      computeIsTakenUpByMe({
        isMyCases: false,
        assignedRadiologistId: null,
        currentUserId: localAdminId,
      })
    ).toBe(false);
  });
});
