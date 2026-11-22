// Layer 2 (Domain/Services): Clinical Report Revision Lifecycle & Version Control Engine
import crypto from 'crypto';
import { db } from '@/db';
import { reports, reportRevisions, studies } from '@/db/schema';
import { eq, or, desc, and, notInArray, inArray } from 'drizzle-orm';
import { logAudit } from './audit.service';
import type { UserContext } from './report.service';

const MAX_ROLLING_REVISIONS = 10;

export type MilestoneTag = 'v1_pgr_draft' | 'v2_consultant_review' | 'v3_hmis_ready' | string;

export interface RecordRevisionParams {
  reportId: string;
  updateData: {
    findings?: string | null;
    impression?: string | null;
    technique?: string | null;
    recommendation?: string | null;
  };
  user: UserContext;
  status: string;
  milestoneTag?: MilestoneTag;
  force?: boolean;
  isAutoSave?: boolean;
}

/**
 * Normalizes content string for comparison (strips excessive trailing whitespace)
 */
function normalizeContent(str?: string | null): string {
  return (str || '').trim();
}

/**
 * Records a new immutable snapshot in report_revisions if clinical content has changed.
 * Prunes rolling draft revisions to MAX_ROLLING_REVISIONS, exempting final and submitted milestones.
 * Invariant: Continuous background auto-saves do not bump the version number.
 */
export async function recordReportRevision(params: RecordRevisionParams): Promise<{ created: boolean; version: number }> {
  const { reportId, updateData, user, status, milestoneTag, force = false, isAutoSave = false } = params;

  // 1. Fetch latest revision to compare
  const [latestRev] = await db
    .select()
    .from(reportRevisions)
    .where(eq(reportRevisions.reportId, reportId))
    .orderBy(desc(reportRevisions.version))
    .limit(1);

  const curFindings = normalizeContent(updateData.findings);
  const curImpression = normalizeContent(updateData.impression);
  const curTechnique = normalizeContent(updateData.technique);
  const curRecommendation = normalizeContent(updateData.recommendation);

  // Auto-save preserves the working draft in reports without generating version spam
  if (isAutoSave && latestRev && !force) {
    return { created: false, version: latestRev.version };
  }

  if (latestRev && !force) {
    const prevFindings = normalizeContent(latestRev.findings);
    const prevImpression = normalizeContent(latestRev.impression);
    const prevTechnique = normalizeContent(latestRev.technique);
    const prevRecommendation = normalizeContent(latestRev.recommendation);

    const isIdentical =
      curFindings === prevFindings &&
      curImpression === prevImpression &&
      curTechnique === prevTechnique &&
      curRecommendation === prevRecommendation &&
      status === latestRev.status;

    if (isIdentical) {
      return { created: false, version: latestRev.version };
    }
  }

  const nextVersion = (latestRev?.version ?? 0) + 1;
  const isConsultant = user.role === 'consultant' || /consultant/i.test(user.title || '');
  const autoTag =
    nextVersion === 1
      ? 'v1_pgr_draft'
      : status === 'final'
      ? 'v3_hmis_ready'
      : status === 'submitted'
      ? 'v1_pgr_draft'
      : isConsultant
      ? 'v2_consultant_review'
      : 'Manual Save';

  const noteText = milestoneTag || autoTag;

  // 2. Insert new revision
  await db.insert(reportRevisions).values({
    id: crypto.randomUUID(),
    reportId,
    version: nextVersion,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    status,
    findings: curFindings,
    impression: curImpression,
    technique: curTechnique,
    recommendation: curRecommendation,
    notes: noteText,
    createdAt: new Date(),
  } as any);

  // 3. Prune old rolling draft revisions beyond MAX_ROLLING_REVISIONS
  try {
    const allRevs = await db
      .select({ id: reportRevisions.id, status: reportRevisions.status, version: reportRevisions.version })
      .from(reportRevisions)
      .where(eq(reportRevisions.reportId, reportId))
      .orderBy(desc(reportRevisions.version));

    // Keep all final/submitted versions permanent. Only prune ordinary drafts beyond cap
    const draftRevs = allRevs.filter((r) => r.status === 'draft' || r.status === 'scheduled');
    if (draftRevs.length > MAX_ROLLING_REVISIONS) {
      const toDelete = draftRevs.slice(MAX_ROLLING_REVISIONS).map((r) => r.id);
      if (toDelete.length > 0) {
        await db.delete(reportRevisions).where(inArray(reportRevisions.id, toDelete));
      }
    }
  } catch (pruneErr) {
    console.warn('[REVISION_PRUNE_WARN] Notice during revision retention prune:', pruneErr);
  }

  return { created: true, version: nextVersion };
}

/**
 * Helper to resolve report ID from reportId, studyId, or accessionNumber
 */
async function resolveReportId(identifier: string): Promise<string> {
  const clean = (identifier || '').trim();
  if (!clean) return clean;

  const [repDirect] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.id, clean))
    .limit(1);
  if (repDirect) return repDirect.id;

  const [repByStudy] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.studyId, clean))
    .limit(1);
  if (repByStudy) return repByStudy.id;

  const [study] = await db
    .select({ id: studies.id })
    .from(studies)
    .where(or(eq(studies.id, clean), eq(studies.accessionNumber, clean.toUpperCase())))
    .limit(1);
  if (study) {
    const [repFromStudy] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.studyId, study.id))
      .limit(1);
    if (repFromStudy) return repFromStudy.id;
  }

  return clean;
}

/**
 * Returns all historical revisions for a report ordered by version descending.
 */
export async function getReportRevisions(reportIdOrStudyId: string) {
  const targetReportId = await resolveReportId(reportIdOrStudyId);

  const list = await db
    .select()
    .from(reportRevisions)
    .where(eq(reportRevisions.reportId, targetReportId))
    .orderBy(desc(reportRevisions.version));

  if (list.length === 0) {
    const [activeRep] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, targetReportId))
      .limit(1);

    if (activeRep) {
      return [
        {
          id: `active-${activeRep.id}`,
          reportId: activeRep.id,
          version: 1,
          authorId: activeRep.authorId || null,
          authorName: activeRep.signedBy || 'Reporting Radiologist',
          authorRole: 'radiologist',
          status: activeRep.status || 'draft',
          findings: activeRep.findings || '',
          impression: activeRep.impression || '',
          technique: activeRep.technique || '',
          recommendation: activeRep.recommendation || '',
          notes: 'Active Working Draft',
          createdAt: String(activeRep.updatedAt || activeRep.createdAt || new Date().toISOString()),
        },
      ];
    }
  }

  return list;
}

/**
 * Returns the latest active revision version number for a report.
 */
export async function getLatestReportVersion(reportIdOrStudyId: string): Promise<number> {
  const revisions = await getReportRevisions(reportIdOrStudyId);
  return revisions[0]?.version ?? 1;
}

/**
 * Restores a historical revision into the active report in an additive, HIPAA-compliant manner.
 */
export async function restoreReportRevision(
  reportIdOrStudyId: string,
  targetVersion: number,
  user: UserContext
): Promise<{ success: boolean; version: number; report: any }> {
  const reportId = await resolveReportId(reportIdOrStudyId);

  // 1. Fetch requested target revision
  const [targetRev] = await db
    .select()
    .from(reportRevisions)
    .where(and(eq(reportRevisions.reportId, reportId), eq(reportRevisions.version, targetVersion)))
    .limit(1);

  if (!targetRev) {
    throw new Error(`Revision version ${targetVersion} not found for report ${reportId}`);
  }

  // 2. Update active report row with restored content
  const now = new Date();
  await db
    .update(reports)
    .set({
      findings: targetRev.findings || '',
      impression: targetRev.impression || '',
      technique: targetRev.technique || '',
      recommendation: targetRev.recommendation || '',
      updatedAt: now,
    } as any)
    .where(eq(reports.id, reportId));

  // 3. Atomically record new additive revision
  const recordRes = await recordReportRevision({
    reportId,
    updateData: {
      findings: targetRev.findings,
      impression: targetRev.impression,
      technique: targetRev.technique,
      recommendation: targetRev.recommendation,
    },
    user,
    status: 'draft',
    milestoneTag: `Restored from v${targetVersion}`,
    force: true,
  });

  // 4. Audit trail entry
  await logAudit({
    userId: user.id,
    userName: user.name,
    action: 'RESTORE_REPORT_REVISION',
    entityType: 'Report',
    entityId: reportId,
    details: `Restored report ${reportId} to version ${targetVersion} (created new version ${recordRes.version}) by ${user.name}`,
  });

  // 5. Trigger multi-destination sync
  (async () => {
    try {
      const { dispatchReportSync } = await import('./report-sync/report-sync-dispatcher.service');
      await dispatchReportSync(reportId, user.id);
    } catch (syncErr) {
      console.warn('[RESTORE_REPORT_SYNC_WARN]', syncErr);
    }
  })();

  const [updatedReport] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

  return {
    success: true,
    version: recordRes.version,
    report: updatedReport,
  };
}
