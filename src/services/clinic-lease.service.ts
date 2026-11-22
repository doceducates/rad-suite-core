// Layer 2: Clinic Node Distributed Study Lease & Peer Coordination Service
import type { InFlightStudyClaim, ActiveUploadStatus, ActiveDownloadStatus } from './clinic-node.types';

const DEFAULT_LEASE_TTL_MS = 15 * 60 * 1000; // 15-minute lease TTL

function getLeaseStore(): Map<string, InFlightStudyClaim> {
  if (!(globalThis as any).__rad_suite_study_leases) {
    (globalThis as any).__rad_suite_study_leases = new Map<string, InFlightStudyClaim>();
  }
  return (globalThis as any).__rad_suite_study_leases;
}

export function buildStudyKey(accession: string, modality = 'MR'): string {
  return `${accession.trim().toUpperCase()}_${modality.trim().toUpperCase()}`;
}

export function pruneExpiredLeases(): void {
  const store = getLeaseStore();
  const now = Date.now();
  for (const [key, claim] of store.entries()) {
    if (claim.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function claimStudyLease(
  nodeId: string,
  accession: string,
  modality = 'MR',
  stage: 'downloading' | 'uploading' = 'uploading',
  progressPercent = 0,
  ttlMs = DEFAULT_LEASE_TTL_MS
): { success: boolean; claim: InFlightStudyClaim; message: string } {
  pruneExpiredLeases();
  const store = getLeaseStore();
  const key = buildStudyKey(accession, modality);
  const now = Date.now();
  const existing = store.get(key);

  if (existing && existing.claimedBy !== nodeId && existing.expiresAt > now) {
    return {
      success: false,
      claim: existing,
      message: `Study ${accession} (${modality}) is already claimed by peer node '${existing.claimedBy}'.`,
    };
  }

  const claim: InFlightStudyClaim = {
    studyKey: key,
    accession: accession.trim().toUpperCase(),
    modality: modality.trim().toUpperCase(),
    claimedBy: nodeId,
    stage,
    progressPercent,
    lastActiveAt: now,
    expiresAt: now + ttlMs,
  };

  store.set(key, claim);
  return {
    success: true,
    claim,
    message: `Study ${accession} (${modality}) leased to node '${nodeId}' for ${Math.round(ttlMs / 60000)}m.`,
  };
}

export function releaseStudyLease(nodeId: string, accession: string, modality = 'MR'): boolean {
  const store = getLeaseStore();
  const key = buildStudyKey(accession, modality);
  const existing = store.get(key);
  if (existing && existing.claimedBy === nodeId) {
    store.delete(key);
    return true;
  }
  return false;
}

export function reconcileNodeLeases(
  nodeId: string,
  activeUpload?: ActiveUploadStatus | null,
  activeDownload?: ActiveDownloadStatus | null
): void {
  pruneExpiredLeases();
  const store = getLeaseStore();
  const currentKeys = new Set<string>();

  if (activeDownload && activeDownload.accession) {
    const k = buildStudyKey(activeDownload.accession, activeDownload.modality);
    currentKeys.add(k);
    claimStudyLease(nodeId, activeDownload.accession, activeDownload.modality, 'downloading', activeDownload.progressPercent);
  }

  if (activeUpload && activeUpload.accession) {
    const k = buildStudyKey(activeUpload.accession, activeUpload.modality);
    currentKeys.add(k);
    claimStudyLease(nodeId, activeUpload.accession, activeUpload.modality, 'uploading', activeUpload.progressPercent);
  }

  // Remove any older leases for this node that are no longer active
  for (const [key, claim] of store.entries()) {
    if (claim.claimedBy === nodeId && !currentKeys.has(key)) {
      store.delete(key);
    }
  }
}

export function getInFlightStudies(excludeNodeId?: string): InFlightStudyClaim[] {
  pruneExpiredLeases();
  const store = getLeaseStore();
  const list = Array.from(store.values());
  if (excludeNodeId) {
    return list.filter((c) => c.claimedBy !== excludeNodeId);
  }
  return list;
}

export function isStudyClaimedByPeer(
  accession: string,
  modality = 'MR',
  myNodeId?: string
): { claimed: boolean; claimedBy?: string; expiresAt?: number } {
  pruneExpiredLeases();
  const store = getLeaseStore();
  const key = buildStudyKey(accession, modality);
  const existing = store.get(key);
  if (existing && (!myNodeId || existing.claimedBy !== myNodeId) && existing.expiresAt > Date.now()) {
    return { claimed: true, claimedBy: existing.claimedBy, expiresAt: existing.expiresAt };
  }
  return { claimed: false };
}

export function clearAllLeases(): void {
  getLeaseStore().clear();
}
