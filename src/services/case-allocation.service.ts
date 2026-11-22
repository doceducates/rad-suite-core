// Layer 2 (Domain/Services): Radiologist Case Allocation & Collision Lock Service
import { eq, sql, and } from 'drizzle-orm';
import { db } from '@/db';
import { studies, users } from '@/db/schema';
import { logAudit } from './audit.service';

export interface UserContext {
  id: string;
  name: string;
  role?: string;
}

export interface ClaimResult {
  success: boolean;
  accessionNumber: string;
  studyId?: string;
  assignedRadiologistId?: string | null;
  assignedRadiologistName?: string | null;
  claimedAt?: string | null;
  conflict?: boolean;
  code?: string;
  message?: string;
  releasedAccessions?: string[];
}

async function getStudyWithAssignee(cleanAcc: string) {
  const rows = await db
    .select({
      study: studies,
      assignedUser: { id: users.id, name: users.name },
    })
    .from(studies)
    .leftJoin(users, eq(users.id, studies.assignedRadiologistId))
    .where(eq(sql`lower(${studies.accessionNumber})`, cleanAcc.toLowerCase()))
    .limit(1);
  return rows[0];
}

/**
 * Claims a case for the authenticated radiologist/resident.
 * Prevents concurrent collisions across PGRs.
 */
export async function claimCase(
  accessionNumber: string,
  user: UserContext,
  force = false
): Promise<ClaimResult> {
  if (!accessionNumber || !user?.id) {
    return { success: false, accessionNumber, message: 'Missing accession or user identity' };
  }

  const cleanAcc = accessionNumber.trim();

  // Storage Isolation Guard: non-admin users must have personal Google Drive connected
  const { getUserStorageTarget, tagCaseForUserStorage } = await import('./case-storage-router.service');
  const storageTarget = await getUserStorageTarget(user.id);
  if (!storageTarget.canClaim && storageTarget.reason === 'GOOGLE_DRIVE_REQUIRED') {
    return {
      success: false,
      accessionNumber: cleanAcc,
      code: 'GOOGLE_DRIVE_REQUIRED',
      message: 'Personal Google Drive connection is required for saving cases. Please connect Google Drive in Settings.',
    };
  }

  const match = await getStudyWithAssignee(cleanAcc);

  // If study is not in DB yet, auto-import from local archive/unified registry or Hospital PACS
  let targetStudyId = match?.study?.id;
  if (!match) {
    const { resolveAndClaimExternalStudy } = await import('./case-import-resolver.service');
    const externalResult = await resolveAndClaimExternalStudy(cleanAcc, user);
    if (externalResult) {
      return externalResult;
    }

    return {
      success: false,
      accessionNumber: cleanAcc,
      message: 'Study not found in database registry, local archive, or Hospital PACS index',
    };
  }

  // 2. Collision Lock Guard: if assigned to another user and !force
  if (
    match.study.assignedRadiologistId &&
    match.study.assignedRadiologistId !== user.id &&
    !force
  ) {
    return {
      success: false,
      conflict: true,
      accessionNumber: cleanAcc,
      studyId: targetStudyId,
      assignedRadiologistId: match.study.assignedRadiologistId,
      assignedRadiologistName: match.assignedUser?.name || 'Another Resident',
      claimedAt: match.study.claimedAt ? new Date(match.study.claimedAt).toISOString() : null,
      message: `Case is already claimed by ${match.assignedUser?.name || 'another radiologist'}`,
    };
  }

  // 3. Atomically claim case
  const now = new Date();
  await db
    .update(studies)
    .set({
      assignedRadiologistId: user.id,
      claimedAt: now,
      status: match.study.status === 'scheduled' ? 'in_progress' : match.study.status,
    })
    .where(eq(studies.id, targetStudyId));

  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'CLAIM_CASE',
    entityType: 'study',
    entityId: targetStudyId,
    details: `Claimed case ${cleanAcc} by ${user.name}`,
  });

  await tagCaseForUserStorage(cleanAcc, user.id);

  return {
    success: true,
    accessionNumber: cleanAcc,
    studyId: targetStudyId,
    assignedRadiologistId: user.id,
    assignedRadiologistName: user.name,
    claimedAt: now.toISOString(),
    message: 'Case successfully claimed',
  };
}

/**
 * Releases a case back into the unassigned department pool.
 * Automatically releases companion studies for the same patient assigned to this radiologist when releaseCompanions is true.
 */
export async function releaseCase(
  accessionNumber: string,
  user: UserContext,
  force = false,
  releaseCompanions = true
): Promise<ClaimResult> {
  if (!accessionNumber || !user?.id) {
    return { success: false, accessionNumber, message: 'Missing accession or user identity' };
  }

  let cleanAcc = accessionNumber.trim();
  try {
    cleanAcc = decodeURIComponent(cleanAcc).trim();
  } catch {}

  const match = await getStudyWithAssignee(cleanAcc);
  if (!match) {
    return {
      success: false,
      accessionNumber: cleanAcc,
      message: 'Study not found in database registry',
    };
  }

  // If claimed by someone else and !force
  if (
    match.study.assignedRadiologistId &&
    match.study.assignedRadiologistId !== user.id &&
    !force
  ) {
    return {
      success: false,
      conflict: true,
      accessionNumber: cleanAcc,
      message: 'Cannot release a case claimed by another radiologist',
    };
  }

  // Identify all studies to release: target study + any companion studies for the same patient assigned to this user
  let studiesToRelease = [match.study];
  if (releaseCompanions && match.study.patientId) {
    const companionMatches = await db
      .select()
      .from(studies)
      .where(
        and(
          eq(studies.patientId, match.study.patientId),
          force ? sql`1=1` : eq(studies.assignedRadiologistId, user.id)
        )
      );
    if (companionMatches.length > 0) {
      studiesToRelease = companionMatches;
    }
  }

  const releasedAccs: string[] = [];
  for (const st of studiesToRelease) {
    const newStatus = st.status === 'in_progress' ? 'scheduled' : st.status;
    await db
      .update(studies)
      .set({
        assignedRadiologistId: null,
        claimedAt: null,
        status: newStatus,
      })
      .where(eq(studies.id, st.id));

    if (st.accessionNumber) {
      releasedAccs.push(st.accessionNumber);
    }

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'RELEASE_CASE',
      entityType: 'study',
      entityId: st.id,
      details: `Released case ${st.accessionNumber} (patient ${st.patientId}) by ${user.name}`,
    });
  }

  return {
    success: true,
    accessionNumber: cleanAcc,
    studyId: match.study.id,
    assignedRadiologistId: null,
    assignedRadiologistName: null,
    claimedAt: null,
    message: releasedAccs.length > 1
      ? `Case and ${releasedAccs.length - 1} companion study(ies) returned to unassigned pool`
      : 'Case returned to unassigned pool',
    releasedAccessions: releasedAccs,
  };
}

/**
 * Query current assignment and claim status for an accession.
 */
export async function getCaseClaimStatus(accessionNumber: string): Promise<ClaimResult> {
  const cleanAcc = accessionNumber.trim();
  const match = await getStudyWithAssignee(cleanAcc);
  if (!match) {
    return {
      success: false,
      accessionNumber: cleanAcc,
      message: 'Case not found',
    };
  }

  return {
    success: true,
    accessionNumber: cleanAcc,
    studyId: match.study.id,
    assignedRadiologistId: match.study.assignedRadiologistId,
    assignedRadiologistName: match.assignedUser?.name || null,
    claimedAt: match.study.claimedAt ? new Date(match.study.claimedAt).toISOString() : null,
  };
}

/**
 * Batch claims multiple cases for a radiologist.
 */
export async function batchClaimCases(
  accessionNumbers: string[],
  user: UserContext,
  force = false
): Promise<{
  claimed: ClaimResult[];
  conflicts: ClaimResult[];
  failed: ClaimResult[];
}> {
  const claimed: ClaimResult[] = [];
  const conflicts: ClaimResult[] = [];
  const failed: ClaimResult[] = [];

  for (const acc of accessionNumbers) {
    const res = await claimCase(acc, user, force);
    if (res.success) {
      claimed.push(res);
    } else if (res.conflict) {
      conflicts.push(res);
    } else {
      failed.push(res);
    }
  }

  return { claimed, conflicts, failed };
}

/**
 * Batch releases multiple cases back into the unassigned pool.
 */
export async function batchReleaseCases(
  accessionNumbers: string[],
  user: UserContext,
  force = false,
  releaseCompanions = true
): Promise<{
  released: ClaimResult[];
  conflicts: ClaimResult[];
  failed: ClaimResult[];
  allReleasedAccessions: string[];
}> {
  const released: ClaimResult[] = [];
  const conflicts: ClaimResult[] = [];
  const failed: ClaimResult[] = [];
  const allReleasedSet = new Set<string>();

  for (const acc of accessionNumbers) {
    if (allReleasedSet.has(acc.trim().toLowerCase())) continue;
    const res = await releaseCase(acc, user, force, releaseCompanions);
    if (res.success) {
      released.push(res);
      if (res.releasedAccessions) {
        for (const a of res.releasedAccessions) {
          allReleasedSet.add(a.trim().toLowerCase());
        }
      } else {
        allReleasedSet.add(acc.trim().toLowerCase());
      }
    } else if (res.conflict) {
      conflicts.push(res);
    } else {
      failed.push(res);
    }
  }

  return {
    released,
    conflicts,
    failed,
    allReleasedAccessions: Array.from(allReleasedSet),
  };
}
