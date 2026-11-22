import { db } from '@/db';
import { studies, patients, reports, reportRevisions } from '@/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import type { ManualCaseInput, UserContext } from './report.service';

export async function createManualCaseAndReport(input: ManualCaseInput, user: UserContext) {
  const { createManualPatientAndStudy } = await import('./patient-management.service');
  return createManualPatientAndStudy(input, user);
}

export async function getReportByStudyOrAccession(studyIdOrAccession: string): Promise<any> {
  const [study] = await db.select().from(studies).where(
    or(eq(studies.id, studyIdOrAccession), eq(studies.accessionNumber, studyIdOrAccession.toUpperCase()))
  ).limit(1);

  if (!study) return null;

  const [patient] = await db.select().from(patients).where(eq(patients.id, study.patientId)).limit(1);
  const [report] = await db.select().from(reports).where(eq(reports.studyId, study.id)).limit(1);

  if (report) {
    if (!report.clinicalHistory && study?.clinicalHistory) {
      report.clinicalHistory = study.clinicalHistory;
    }
    const [latestRev] = await db
      .select({ version: reportRevisions.version })
      .from(reportRevisions)
      .where(eq(reportRevisions.reportId, report.id))
      .orderBy(desc(reportRevisions.version))
      .limit(1);
    (report as any).currentVersion = latestRev?.version ?? 1;
    (report as any).criticalFinding = Boolean(report.criticalFinding);
  }

  return { study, patient, report };
}
