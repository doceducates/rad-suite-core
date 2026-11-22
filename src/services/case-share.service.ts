// Layer 2 (Domain/Services): Secure Consultant Case Sharing Service (<280 lines)
import crypto from 'crypto';
import { db, sqlite, IS_SQLITE } from '@/db';
import { caseShares, studies, patients, reports, users } from '@/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '@/services/auth-crypto';
import { logAudit } from '@/services/audit.service';
import { getStudyManifest } from '@/services/study-manifest.service';
import { config } from '@/lib/config';
import {
  SHARE_SECRET,
  generateMemorablePin,
  generateShareToken,
  createShareSessionProof,
  verifyShareSessionProof,
  type CreateShareInput,
  type ShareResult,
  type ShareRecord,
} from './case-share-crypto';

export {
  generateMemorablePin,
  generateShareToken,
  createShareSessionProof,
  verifyShareSessionProof,
  type CreateShareInput,
  type ShareResult,
  type ShareRecord,
};

export async function createCaseShare(userId: string, input: CreateShareInput): Promise<ShareResult> {
  let [study] = await db
    .select()
    .from(studies)
    .where(or(eq(studies.id, input.studyId as any), eq(studies.accessionNumber, input.studyId)))
    .limit(1);

  if (!study) {
    try {
      const { resolveWorkspaceCase } = await import('@/services/workspace-case-resolver.service');
      const resolved = await resolveWorkspaceCase(input.studyId, { id: userId });
      if (resolved?.study?.id) {
        [study] = await db.select().from(studies).where(eq(studies.id, resolved.study.id)).limit(1);
      }
    } catch {}
  }

  if (!study) {
    throw new Error('Study not found');
  }

  const token = generateShareToken();
  const passwordPin = (input.password || '').trim() || generateMemorablePin();
  const passwordHash = await hashPassword(passwordPin);

  const durationHours = input.durationHours && input.durationHours > 0 ? input.durationHours : 72;
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt).toISOString()
    : new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  let validCreatorId: string | null = null;
  if (userId) {
    try {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId as any)).limit(1);
      if (u) validCreatorId = u.id;
    } catch {}
  }

  if (IS_SQLITE && sqlite) {
    sqlite
      .prepare(
        `INSERT INTO case_shares (id, study_id, token, password_hash, password_hint, expires_at, duration_hours, max_views, view_count, is_active, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)`
      )
      .run(
        id,
        study.id,
        token,
        passwordHash,
        input.passwordHint || null,
        expiresAt,
        durationHours,
        input.maxViews || null,
        validCreatorId,
        now,
        now
      );
  } else {
    await db.insert(caseShares).values({
      id: id as any,
      studyId: study.id as any,
      token,
      passwordHash,
      passwordHint: input.passwordHint || null,
      expiresAt: expiresAt as any,
      durationHours,
      maxViews: input.maxViews || null,
      viewCount: 0,
      isActive: true,
      createdBy: validCreatorId as any,
      createdAt: now as any,
      updatedAt: now as any,
    });
  }

  await logAudit({
    userId,
    action: 'CREATE_CASE_SHARE',
    entityType: 'Study',
    entityId: study.accessionNumber,
    details: `Created consultant share token valid until ${expiresAt} (${durationHours}h)`,
  });

  const baseUrl = config.appUrl;
  const shareUrl = `${baseUrl}/share/${token}`;

  return {
    id,
    studyId: study.id,
    token,
    passwordPin,
    passwordHint: input.passwordHint || undefined,
    expiresAt,
    durationHours,
    shareUrl,
  };
}

async function getShareByToken(token: string) {
  if (IS_SQLITE && sqlite) {
    return sqlite.prepare('SELECT * FROM case_shares WHERE token = ?').get(token) as any;
  }
  const [row] = await db.select().from(caseShares).where(eq(caseShares.token, token)).limit(1);
  return row as any;
}

export async function getPublicShareMeta(token: string) {
  const share = await getShareByToken(token);
  if (!share) return { status: 'not_found' as const };

  const isExpired = new Date(share.expires_at || share.expiresAt).getTime() <= Date.now();
  const isRevoked = !share.is_active && share.isActive !== 1 && share.isActive !== true;
  const isMaxedOut = Boolean(share.max_views && (share.view_count || share.viewCount) >= share.max_views);

  if (isRevoked || isExpired || isMaxedOut) {
    return {
      status: 'expired_or_invalid' as const,
      reason: isRevoked ? 'revoked' : isMaxedOut ? 'max_views_reached' : 'expired',
    };
  }

  let preview: any = null;
  try {
    const studyId = share.study_id || share.studyId;
    const [st] = await db.select().from(studies).where(eq(studies.id, studyId as any)).limit(1);
    if (st) preview = { modality: st.modality, scanType: st.scanType, bodyPart: st.bodyPart };
  } catch {}

  return {
    status: 'valid' as const,
    token: share.token,
    passwordHint: share.password_hint || share.passwordHint || undefined,
    expiresAt: share.expires_at || share.expiresAt,
    studyPreview: preview,
  };
}

export async function verifyConsultantShare(token: string, passwordAttempt: string, ip?: string) {
  const share = await getShareByToken(token);
  if (!share) return { success: false, error: 'Share link not found' };

  const expiresAt = share.expires_at || share.expiresAt;
  const isExpired = new Date(expiresAt).getTime() <= Date.now();
  const isRevoked = !share.is_active && share.isActive !== 1 && share.isActive !== true;
  if (isRevoked || isExpired) {
    return { success: false, error: 'This share link has expired or been revoked.' };
  }

  const passwordHash = share.password_hash || share.passwordHash;
  const isValid = await verifyPassword(passwordAttempt.trim(), passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid PIN / Password. Please check with your colleague.' };
  }

  const newViews = (share.view_count ?? share.viewCount ?? 0) + 1;
  const now = new Date().toISOString();
  if (IS_SQLITE && sqlite) {
    sqlite.prepare('UPDATE case_shares SET view_count = ?, updated_at = ? WHERE id = ?').run(newViews, now, share.id);
  } else {
    await db.update(caseShares).set({ viewCount: newViews, updatedAt: now as any }).where(eq(caseShares.id, share.id));
  }

  await logAudit({
    action: 'CONSULTANT_SHARE_ACCESSED',
    entityType: 'Study',
    entityId: share.study_id || share.studyId,
    details: `Consultant unlocked case share [token: ${token.substring(0, 8)}...] from IP ${ip || 'unknown'}`,
  });

  const sessionProof = createShareSessionProof(token, share.id, expiresAt);
  return { success: true, sessionProof, expiresAt };
}

export async function getSharedStudyDetails(token: string, sessionProof?: string) {
  if (!verifyShareSessionProof(token, sessionProof)) {
    throw new Error('Unauthorized or expired consultant session proof');
  }

  const share = await getShareByToken(token);

  if (!share || (!share.is_active && share.isActive !== 1 && share.isActive !== true)) {
    throw new Error('Share link is no longer active');
  }

  const studyId = share.study_id || share.studyId;
  const [study] = await db.select().from(studies).where(eq(studies.id, studyId as any)).limit(1);
  if (!study) throw new Error('Study record not found');

  const [patient] = await db.select().from(patients).where(eq(patients.id, study.patientId as any)).limit(1);
  const [report] = await db.select().from(reports).where(eq(reports.studyId, study.id as any)).limit(1);

  // Author details (PGR or reporting radiologist)
  let authorName = 'PGR Radiologist';
  if (report?.pgrAuthorId || study.assignedRadiologistId) {
    const authorId = report?.pgrAuthorId || study.assignedRadiologistId;
    const [u] = await db.select().from(users).where(eq(users.id, authorId as any)).limit(1);
    if (u) authorName = u.name;
  }

  const manifest = await getStudyManifest(study.accessionNumber, { modality: study.modality });

  return {
    share: {
      expiresAt: share.expires_at || share.expiresAt,
      viewCount: share.view_count ?? share.viewCount ?? 0,
      createdAt: share.created_at || share.createdAt,
    },
    study: {
      id: study.id,
      accessionNumber: study.accessionNumber,
      modality: study.modality,
      scanType: study.scanType,
      bodyPart: study.bodyPart,
      priority: study.priority,
      scheduledAt: study.scheduledAt,
      clinicalHistory: study.clinicalHistory || report?.clinicalHistory || '',
    },
    patient: {
      fullName: patient?.fullName || 'Patient',
      mrNumber: patient?.mrNumber || '',
      age: patient?.age ?? 30,
      gender: patient?.gender || 'Unknown',
    },
    report: {
      id: report?.id,
      technique: report?.technique || '',
      findings: report?.findings || '',
      impression: report?.impression || '',
      status: report?.status || 'draft',
      criticalFinding: Boolean(report?.criticalFinding),
      authorName,
      signedAt: report?.signedAt,
    },
    series: manifest?.series || [],
    source: manifest?.source || 'local',
  };
}

export async function listSharesForStudy(studyId: string) {
  let resolvedId = studyId;
  try {
    const [st] = await db
      .select({ id: studies.id })
      .from(studies)
      .where(or(eq(studies.id, studyId as any), eq(studies.accessionNumber, studyId)))
      .limit(1);
    if (st) resolvedId = st.id;
  } catch {}

  if (IS_SQLITE && sqlite) {
    return sqlite
      .prepare('SELECT id, token, password_hint, expires_at, duration_hours, view_count, is_active, created_at FROM case_shares WHERE study_id = ? ORDER BY created_at DESC')
      .all(resolvedId);
  }
  return db
    .select({
      id: caseShares.id,
      token: caseShares.token,
      passwordHint: caseShares.passwordHint,
      expiresAt: caseShares.expiresAt,
      durationHours: caseShares.durationHours,
      viewCount: caseShares.viewCount,
      isActive: caseShares.isActive,
      createdAt: caseShares.createdAt,
    })
    .from(caseShares)
    .where(eq(caseShares.studyId, resolvedId as any))
    .orderBy(desc(caseShares.createdAt));
}

export async function revokeCaseShare(shareId: string, userId: string) {
  const now = new Date().toISOString();
  if (IS_SQLITE && sqlite) {
    sqlite.prepare('UPDATE case_shares SET is_active = 0, updated_at = ? WHERE id = ?').run(now, shareId);
  } else {
    await db.update(caseShares).set({ isActive: false, updatedAt: now as any }).where(eq(caseShares.id, shareId as any));
  }
  await logAudit({
    userId,
    action: 'REVOKE_CASE_SHARE',
    entityType: 'CaseShare',
    entityId: shareId,
    details: `Revoked case share link ID ${shareId}`,
  });
  return { success: true };
}
