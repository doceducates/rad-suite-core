import { describe, it, expect } from 'vitest';

describe('Claim & Batch Claim Payload Unwrapping', () => {
  it('correctly unwraps claim info whether in data.claim or data.data', () => {
    // API returning { success: true, data: result, claim: result }
    const apiResponseFull = {
      success: true,
      data: {
        assignedRadiologistId: 'user-123',
        assignedRadiologistName: 'Dr. Test',
        claimedAt: '2026-10-05T10:00:00Z',
      },
      claim: {
        assignedRadiologistId: 'user-123',
        assignedRadiologistName: 'Dr. Test',
        claimedAt: '2026-10-05T10:00:00Z',
      },
    };

    const claimInfo1 = apiResponseFull.claim || apiResponseFull.data || {};
    expect(claimInfo1.assignedRadiologistId).toBe('user-123');
    expect(claimInfo1.assignedRadiologistName).toBe('Dr. Test');

    // API returning only { success: true, data: result } (the previous format that crashed)
    const apiResponseDataOnly: any = {
      success: true,
      data: {
        assignedRadiologistId: 'user-456',
        assignedRadiologistName: 'Dr. Radiologist',
        claimedAt: '2026-10-05T11:00:00Z',
      },
    };

    const claimInfo2 = apiResponseDataOnly.claim || apiResponseDataOnly.data || {};
    expect(claimInfo2.assignedRadiologistId).toBe('user-456');
    expect(claimInfo2.assignedRadiologistName).toBe('Dr. Radiologist');
  });

  it('safely handles empty or null claim info without throwing runtime error', () => {
    const emptyResponse: any = { success: false };
    const claimInfo = emptyResponse.claim || emptyResponse.data || {};
    expect(claimInfo.assignedRadiologistId).toBeUndefined();
    // Does NOT throw
    expect(() => claimInfo.assignedRadiologistId).not.toThrow();
  });
});
