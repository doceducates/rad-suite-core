// Layer 2 (Domain/Services): Clinical Case Discussion Persistence & Report Synthesis
// Strict File Size Invariant: Target < 250 lines, max 350 lines

import { db } from '@/db';
import { reports, studies } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { logAudit } from './audit.service';
import type { UserContext } from './report.service';
import {
  type DiscussionFinding,
  type CaseDiscussionPayload,
  compileDiscussionToReportHtml,
  extractFindingsFromHtml,
  findingsToBulletHtml,
} from '@/lib/discussion-compiler';

export {
  type DiscussionFinding,
  type CaseDiscussionPayload,
  compileDiscussionToReportHtml,
  extractFindingsFromHtml,
  findingsToBulletHtml,
};

export async function getDiscussionData(
  idOrAccession: string
): Promise<CaseDiscussionPayload | null> {
  const cleanId = idOrAccession.trim();
  const [study] = await db
    .select({ id: studies.id })
    .from(studies)
    .where(or(eq(studies.id, cleanId), eq(studies.accessionNumber, cleanId.toUpperCase())))
    .limit(1);

  const reportQuery = study
    ? or(eq(reports.id, cleanId), eq(reports.studyId, study.id))
    : eq(reports.id, cleanId);

  const [rep] = await db
    .select({
      id: reports.id,
      discussionJson: (reports as any).discussionJson,
      findings: reports.findings,
      impression: reports.impression,
    })
    .from(reports)
    .where(reportQuery)
    .limit(1);

  if (!rep) return null;

  if (rep.discussionJson) {
    try {
      const parsed = typeof rep.discussionJson === 'string'
        ? JSON.parse(rep.discussionJson)
        : rep.discussionJson;
      const findings = Array.isArray(parsed.positiveFindings) ? parsed.positiveFindings : [];
      const html = parsed.positiveFindingsHtml || (findings.length > 0 ? findingsToBulletHtml(findings) : '');
      return {
        positiveFindings: findings,
        positiveFindingsHtml: html,
        consultantNotes: parsed.consultantNotes || '',
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    } catch {}
  }

  // Fallback: If no discussionJson yet, extract key findings from HTML findings if available
  if (rep.findings && rep.findings.trim()) {
    const extracted = extractFindingsFromHtml(rep.findings);
    const html = extracted.length > 0 ? findingsToBulletHtml(extracted) : rep.findings;
    return {
      positiveFindings: extracted,
      positiveFindingsHtml: html,
      consultantNotes: '',
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function saveDiscussionData(
  idOrAccession: string,
  payload: CaseDiscussionPayload,
  user?: UserContext
): Promise<{ success: boolean; reportId?: string }> {
  const cleanId = idOrAccession.trim();
  const [study] = await db
    .select({ id: studies.id, accessionNumber: studies.accessionNumber })
    .from(studies)
    .where(or(eq(studies.id, cleanId), eq(studies.accessionNumber, cleanId.toUpperCase())))
    .limit(1);

  const reportQuery = study
    ? or(eq(reports.id, cleanId), eq(reports.studyId, study.id))
    : eq(reports.id, cleanId);

  const [rep] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(reportQuery)
    .limit(1);

  if (!rep) {
    return { success: false };
  }

  const findings = payload.positiveFindings && payload.positiveFindings.length > 0
    ? payload.positiveFindings
    : (payload.positiveFindingsHtml ? extractFindingsFromHtml(payload.positiveFindingsHtml) : []);

  const html = payload.positiveFindingsHtml !== undefined
    ? payload.positiveFindingsHtml
    : findingsToBulletHtml(findings);

  const jsonStr = JSON.stringify({
    positiveFindings: findings,
    positiveFindingsHtml: html,
    consultantNotes: payload.consultantNotes || '',
    updatedAt: new Date().toISOString(),
  });

  await db
    .update(reports)
    .set({
      discussionJson: jsonStr,
      updatedAt: new Date(),
    } as any)
    .where(eq(reports.id, rep.id));

  if (user?.id) {
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'SAVE_DISCUSSION_SUMMARY',
      entityType: 'Report',
      entityId: rep.id,
      details: `Saved discussion summary (${payload.positiveFindings?.length || 0} findings) for case ${cleanId}`,
    }).catch(() => {});
  }

  return { success: true, reportId: rep.id };
}


