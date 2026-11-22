import { describe, it, expect, beforeEach } from 'vitest';
import {
  claimStudyLease,
  releaseStudyLease,
  reconcileNodeLeases,
  getInFlightStudies,
  isStudyClaimedByPeer,
  clearAllLeases,
} from '../clinic-lease.service';

describe('Clinic Lease Service - Distributed Work Coordination', () => {
  beforeEach(() => {
    clearAllLeases();
  });

  it('allows a node to claim a study lease', () => {
    const res = claimStudyLease('PC-1', 'ACC-100', 'MR', 'uploading', 10);
    expect(res.success).toBe(true);
    expect(res.claim.claimedBy).toBe('PC-1');
    expect(res.claim.accession).toBe('ACC-100');
    expect(res.claim.modality).toBe('MR');

    const inFlight = getInFlightStudies();
    expect(inFlight).toHaveLength(1);
    expect(inFlight[0].accession).toBe('ACC-100');
  });

  it('detects when a study is claimed by a peer node but not by itself', () => {
    claimStudyLease('PC-1', 'ACC-200', 'CT', 'uploading', 0);

    // PC-2 checks if ACC-200 is claimed by peer -> claimed: true, claimedBy: PC-1
    const peerCheck = isStudyClaimedByPeer('ACC-200', 'CT', 'PC-2');
    expect(peerCheck.claimed).toBe(true);
    expect(peerCheck.claimedBy).toBe('PC-1');

    // PC-1 checks if ACC-200 is claimed by peer -> claimed: false (it owns the lease)
    const selfCheck = isStudyClaimedByPeer('ACC-200', 'CT', 'PC-1');
    expect(selfCheck.claimed).toBe(false);

    // Different accession -> false
    expect(isStudyClaimedByPeer('ACC-999', 'CT', 'PC-2').claimed).toBe(false);
  });

  it('releases study lease on completion', () => {
    claimStudyLease('PC-1', 'ACC-300', 'MR', 'uploading', 0);
    expect(isStudyClaimedByPeer('ACC-300', 'MR', 'PC-2').claimed).toBe(true);

    const released = releaseStudyLease('PC-1', 'ACC-300', 'MR');
    expect(released).toBe(true);
    expect(isStudyClaimedByPeer('ACC-300', 'MR', 'PC-2').claimed).toBe(false);
    expect(getInFlightStudies()).toHaveLength(0);
  });

  it('reconciles leases and releases finished studies for a node', () => {
    claimStudyLease('PC-1', 'ACC-400', 'MR', 'uploading', 20);
    expect(getInFlightStudies()).toHaveLength(1);

    // PC-1 now has no active upload or download (finished)
    reconcileNodeLeases('PC-1', null, null);

    const remaining = getInFlightStudies();
    expect(remaining).toHaveLength(0);

    // Study is no longer claimed
    expect(isStudyClaimedByPeer('ACC-400', 'MR', 'PC-2').claimed).toBe(false);
  });
});
