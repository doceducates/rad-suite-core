/**
 * PACS Study Deduplication & Worklist Correlation Service (P1 #14)
 *
 * Prevents redundant C-FIND results, merges multi-series PACS study entries,
 * and correlates external archives against active local worklists.
 */

import type { PacsStudyResult } from '@/types/pacs';

export interface CorrelatedPacsStudy extends PacsStudyResult {
  isImported?: boolean;
  localStudyId?: string;
  localStatus?: string;
}

/**
 * Deduplicates an array of PACS C-FIND study results by canonical accession number
 * and Study Instance UID, merging series counts and preserving complete metadata.
 */
export function deduplicatePacsStudies(studies: PacsStudyResult[]): PacsStudyResult[] {
  if (!studies || studies.length === 0) return [];

  const studyMap = new Map<string, PacsStudyResult>();

  for (const study of studies) {
    const rawKey = study.accessionNumber?.trim().toUpperCase() || study.studyInstanceUid || '';
    if (!rawKey) continue;

    if (!studyMap.has(rawKey)) {
      studyMap.set(rawKey, { ...study });
    } else {
      const existing = studyMap.get(rawKey)!;
      // Merge records: prefer richer metadata
      existing.numSeries = Math.max(existing.numSeries || 1, study.numSeries || 1);
      existing.numInstances = Math.max(existing.numInstances || 1, study.numInstances || 1);
      if (!existing.studyDescription && study.studyDescription) {
        existing.studyDescription = study.studyDescription;
      }
      if (!existing.referringDoctor && study.referringDoctor) {
        existing.referringDoctor = study.referringDoctor;
      }
      if (!existing.patientName && study.patientName) {
        existing.patientName = study.patientName;
      }
      if (existing.modality === 'OT' && study.modality !== 'OT') {
        existing.modality = study.modality;
      }
    }
  }

  return Array.from(studyMap.values());
}

/**
 * Correlates PACS C-FIND results with local worklist studies.
 * Tags records with `isImported` and `localStatus`.
 */
export function correlateWithLocalWorklist(
  pacsStudies: PacsStudyResult[],
  localStudies: Array<{ id: string; accessionNumber: string; status: string }>
): CorrelatedPacsStudy[] {
  const localMap = new Map<string, { id: string; status: string }>();

  for (const ls of localStudies) {
    if (ls.accessionNumber) {
      localMap.set(ls.accessionNumber.trim().toUpperCase(), { id: ls.id, status: ls.status });
    }
  }

  return pacsStudies.map((ps) => {
    const key = ps.accessionNumber?.trim().toUpperCase();
    const local = key ? localMap.get(key) : undefined;

    if (local) {
      return {
        ...ps,
        isImported: true,
        localStudyId: local.id,
        localStatus: local.status,
      };
    }

    return {
      ...ps,
      isImported: false,
    };
  });
}

// In-flight import lock tracker to avoid concurrent duplicate writes
const inFlightImports = new Set<string>();

export function acquireImportLock(accessionNumber: string): boolean {
  const key = accessionNumber.trim().toUpperCase();
  if (inFlightImports.has(key)) {
    return false;
  }
  inFlightImports.add(key);
  return true;
}

export function releaseImportLock(accessionNumber: string): void {
  const key = accessionNumber.trim().toUpperCase();
  inFlightImports.delete(key);
}
