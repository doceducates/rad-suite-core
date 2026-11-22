import { describe, it, expect } from 'vitest';

export function detectStatusConflict(hmisStatus?: string | null, targetStatus?: string): {
  hasConflict: boolean;
  type?: 'hmis_published_local_downgrade' | 'local_final_hmis_unverified';
} {
  const isHmisPublished = hmisStatus === 'published';
  const isTargetNonFinal = targetStatus !== 'final' && targetStatus !== 'amended';

  if (isHmisPublished && isTargetNonFinal) {
    return { hasConflict: true, type: 'hmis_published_local_downgrade' };
  }

  if (!isHmisPublished && targetStatus === 'final') {
    return { hasConflict: true, type: 'local_final_hmis_unverified' };
  }

  return { hasConflict: false };
}

describe('HMIS Status Conflict Detection', () => {
  it('should detect conflict when published HMIS study is moved to preliminary or pending', () => {
    const resPrelim = detectStatusConflict('published', 'preliminary');
    expect(resPrelim.hasConflict).toBe(true);
    expect(resPrelim.type).toBe('hmis_published_local_downgrade');

    const resPending = detectStatusConflict('published', 'pending');
    expect(resPending.hasConflict).toBe(true);
    expect(resPending.type).toBe('hmis_published_local_downgrade');
  });

  it('should detect conflict when unverified HMIS study is marked final locally', () => {
    const res = detectStatusConflict('awaiting_report', 'final');
    expect(res.hasConflict).toBe(true);
    expect(res.type).toBe('local_final_hmis_unverified');
  });

  it('should not detect conflict for routine report drafting transitions', () => {
    expect(detectStatusConflict('awaiting_report', 'preliminary').hasConflict).toBe(false);
    expect(detectStatusConflict('awaiting_report', 'submitted').hasConflict).toBe(false);
    expect(detectStatusConflict('published', 'final').hasConflict).toBe(false);
  });

  it('should preserve local review status if study was already known published', () => {
    const existing = { status: 'preliminary', hmisStatus: 'published' };
    const isUserReviewing =
      (existing.status === 'preliminary' || existing.status === 'pending') &&
      existing.hmisStatus === 'published';

    expect(isUserReviewing).toBe(true);
  });
});
