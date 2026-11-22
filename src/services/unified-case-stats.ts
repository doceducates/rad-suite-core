import type { PacsStudyResult } from '@/types/pacs';
import { db } from '@/db';
import { studies, patients, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isFilmChargesStudy, matchesDepartment, matchesFilmCharges } from './unified-case-filters';
import { parseStudyTimestamp } from './study-sorting';

export async function getDbStudiesMap(): Promise<Map<string, { study: any; patient: any; report: any }>> {
  const map = new Map<string, { study: any; patient: any; report: any }>();
  try {
    const rows = await db
      .select({
        study: studies,
        patient: patients,
        report: reports,
      })
      .from(studies)
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .leftJoin(reports, eq(reports.studyId, studies.id));

    for (const r of rows) {
      if (r.study?.accessionNumber) {
        map.set(r.study.accessionNumber.toLowerCase(), r);
      }
    }
  } catch (err) {
    console.warn('[DB_MAP_WARN] Failed reading DB studies map:', err);
  }
  return map;
}

export function markCompanionStudies(allCases: PacsStudyResult[]): void {
  const patientGroups = new Map<string, PacsStudyResult[]>();
  for (const c of allCases) {
    const raw = c.patientId || c.patientMrn || c.patientName;
    const norm = raw ? raw.replace(/\D/g, '').toLowerCase() || raw.toLowerCase().trim() : '';
    if (norm) {
      const grp = patientGroups.get(norm) || [];
      grp.push(c);
      patientGroups.set(norm, grp);
    }
  }

  for (const grp of patientGroups.values()) {
    const diagnosticStudies = grp.filter(
      (c) => !c.isFilmCharges && !isFilmChargesStudy(c.studyDescription || c.scanType, (c as any).cpt)
    );

    if (diagnosticStudies.length > 1) {
      for (const c of diagnosticStudies) {
        const cTime = parseStudyTimestamp(c.studyDate, c.studyTime);

        // Same-encounter companion studies: within 36 hours or matching calendar date
        const companions = diagnosticStudies.filter((other) => {
          if (other.accessionNumber.toUpperCase() === c.accessionNumber.toUpperCase()) return false;
          const otherTime = parseStudyTimestamp(other.studyDate, other.studyTime);
          const sameDay = Boolean(
            c.studyDate &&
            other.studyDate &&
            c.studyDate.slice(0, 10) === other.studyDate.slice(0, 10)
          );
          return sameDay || (cTime > 0 && otherTime > 0 && Math.abs(cTime - otherTime) <= 36 * 3600 * 1000);
        });

        // Prior studies: diagnostic examinations performed in earlier encounters
        const priors = diagnosticStudies.filter((other) => {
          if (other.accessionNumber.toUpperCase() === c.accessionNumber.toUpperCase()) return false;
          const otherTime = parseStudyTimestamp(other.studyDate, other.studyTime);
          const sameDay = Boolean(
            c.studyDate &&
            other.studyDate &&
            c.studyDate.slice(0, 10) === other.studyDate.slice(0, 10)
          );
          if (sameDay) return false;
          return (cTime > 0 && otherTime > 0 && otherTime < cTime - 36 * 3600 * 1000) ||
            Boolean(other.studyDate && c.studyDate && other.studyDate < c.studyDate);
        });

        if (companions.length > 0) {
          c.isMultiStudy = true;
          c.duplicateCount = companions.length + 1;
          c.companionStudies = companions.map((other) => ({
            accessionNumber: other.accessionNumber,
            studyDescription: other.studyDescription || other.scanType || 'Study',
            status: other.status,
            modality: other.modality,
            studyDate: other.studyDate,
            isFilmCharges: other.isFilmCharges,
          }));
        }

        if (priors.length > 0) {
          c.priorStudies = priors.map((other) => ({
            accessionNumber: other.accessionNumber,
            studyDescription: other.studyDescription || other.scanType || 'Study',
            status: other.status,
            modality: other.modality,
            studyDate: other.studyDate,
            reportId: other.reportId,
          }));
        }
      }
    }
  }
}

export function computeWorklistStats(allCases: PacsStudyResult[], filter: any) {
  return {
    total: allCases.length,
    statCount: allCases.filter((c) => c.priority === 'stat').length,
    scheduledCount: allCases.filter((c) => !c.status || c.status === 'scheduled').length,
    draftCount: allCases.filter((c) => c.status === 'draft').length,
    finalCount: allCases.filter((c) => c.status === 'final' || c.status === 'finalized' || c.status === 'reported').length,
    prelimCount: allCases.filter((c) => c.status === 'preliminary').length,
    submittedCount: allCases.filter((c) => c.status === 'submitted').length,
    amendedCount: allCases.filter((c) => c.status === 'amended').length,
    pendingCount: allCases.filter((c) => c.status === 'pending').length,
    myCount: allCases.filter((c) => filter.currentUserId ? c.assignedRadiologistId === filter.currentUserId : Boolean(c.assignedRadiologistId)).length,
    unassignedCount: allCases.filter((c) => !c.assignedRadiologistId).length,
    hmisCount: allCases.filter((c) => Boolean(c.hmisStatus && c.hmisStatus !== 'unknown' && c.hmisStatus !== 'not_found')).length,
    criticalCount: allCases.filter((c) => c.criticalFinding).length,
    opdCount: allCases.filter((c) => matchesDepartment(c.department, 'opd')).length,
    erCount: allCases.filter((c) => matchesDepartment(c.department, 'er')).length,
    wardCount: allCases.filter((c) => matchesDepartment(c.department, 'ward')).length,
    filmChargesHiddenCount: allCases.filter((c) => c.isFilmCharges && !matchesFilmCharges(c, filter.hideFilmCharges)).length,
  };
}
