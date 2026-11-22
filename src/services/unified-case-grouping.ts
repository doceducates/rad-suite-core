// Layer 2 (Domain/Services): Multi-Study Patient Consolidation
import type { PacsStudyResult } from '@/types/pacs';
import { parseStudyTimestamp } from './study-sorting';

// 36 hours encounter window for clinical sessions & overnight admissions
const ENCOUNTER_WINDOW_MS = 36 * 60 * 60 * 1000;

function getStudyTimestamp(s: PacsStudyResult): number {
  return parseStudyTimestamp(s.studyDate, s.studyTime);
}

function getStudyStatusWeight(status?: string): number {
  const s = (status || '').toLowerCase();
  if (s === 'draft' || s === 'preliminary' || s === 'in_progress') return 4;
  if (s === 'scheduled' || s === 'awaiting_report' || s === 'pending') return 3;
  if (s === 'submitted') return 2;
  if (s === 'final' || s === 'finalized' || s === 'reported' || s === 'published') return 1;
  if (s === 'cancelled') return 0;
  return 2;
}

interface EncounterCluster {
  studies: PacsStudyResult[];
  minTime: number;
  maxTime: number;
  minPos: number;
}

function clusterPatientStudiesIntoEncounters(
  patientCases: PacsStudyResult[],
  casesOriginalList: PacsStudyResult[]
): EncounterCluster[] {
  const nonCancelled = patientCases.filter((s) => (s.status as string) !== 'cancelled');
  const effectiveCases = nonCancelled.length > 0 ? nonCancelled : patientCases;

  const diagnosticScans = effectiveCases.filter((s) => !s.isFilmCharges);
  const filmCharges = effectiveCases.filter((s) => s.isFilmCharges);

  const baseScans = diagnosticScans.length > 0 ? diagnosticScans : filmCharges;

  // Sort base scans chronologically (or by accession if timestamps match)
  const sorted = [...baseScans].sort((a, b) => {
    const tA = getStudyTimestamp(a);
    const tB = getStudyTimestamp(b);
    if (tA && tB && tA !== tB) return tA - tB;
    return a.accessionNumber.localeCompare(b.accessionNumber);
  });

  const clusters: EncounterCluster[] = [];

  for (const scan of sorted) {
    const scanTime = getStudyTimestamp(scan);
    const scanPos = casesOriginalList.indexOf(scan);

    let matchedCluster: EncounterCluster | undefined;
    for (const cluster of clusters) {
      const sameDate =
        scan.studyDate &&
        cluster.studies[0]?.studyDate &&
        scan.studyDate.slice(0, 10) === cluster.studies[0]?.studyDate.slice(0, 10);

      const timeDiff = Math.min(
        Math.abs(scanTime - cluster.minTime),
        Math.abs(scanTime - cluster.maxTime)
      );

      if (sameDate || (scanTime > 0 && cluster.minTime > 0 && timeDiff <= ENCOUNTER_WINDOW_MS)) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      matchedCluster.studies.push(scan);
      if (scanTime > 0) {
        matchedCluster.minTime = Math.min(matchedCluster.minTime, scanTime);
        matchedCluster.maxTime = Math.max(matchedCluster.maxTime, scanTime);
      }
      if (scanPos !== -1) {
        matchedCluster.minPos = Math.min(matchedCluster.minPos, scanPos);
      }
    } else {
      clusters.push({
        studies: [scan],
        minTime: scanTime || 0,
        maxTime: scanTime || 0,
        minPos: scanPos !== -1 ? scanPos : 999999,
      });
    }
  }

  // If diagnostic scans exist, attach administrative film charges to the closest diagnostic cluster
  if (diagnosticScans.length > 0 && filmCharges.length > 0) {
    for (const fc of filmCharges) {
      const fcTime = getStudyTimestamp(fc);
      let closest = clusters[0];
      let minDiff = Infinity;
      for (const cluster of clusters) {
        const diff = Math.min(
          Math.abs(fcTime - cluster.minTime),
          Math.abs(fcTime - cluster.maxTime)
        );
        if (diff < minDiff) {
          minDiff = diff;
          closest = cluster;
        }
      }
      if (closest && !closest.studies.some((s) => s.accessionNumber === fc.accessionNumber)) {
        closest.studies.push(fc);
      }
    }
  }

  return clusters;
}

/**
 * Consolidates individual diagnostic studies belonging to the same patient encounter
 * into a single case row. Studies on different dates remain separate encounter rows
 * with prior study awareness so active unread work is never masked by historical cases.
 */
export function consolidatePatientStudies(
  cases: PacsStudyResult[],
  hideFilmCharges: boolean = true,
  explicitSearchQuery?: string
): PacsStudyResult[] {
  if (!cases || cases.length <= 1) return cases;

  const patientMap = new Map<string, PacsStudyResult[]>();
  const unlinkedCases: { item: PacsStudyResult; pos: number }[] = [];

  cases.forEach((c, idx) => {
    const rawMrn = c.patientMrn || c.patientId || '';
    const normMrn = rawMrn.trim().toLowerCase();
    // Do not group cases if MRN is missing, unknown, or generic
    if (!normMrn || normMrn === 'unknown' || normMrn === 'n/a' || normMrn === 'none' || normMrn === 'null' || normMrn === '-') {
      unlinkedCases.push({ item: { ...c, isMultiStudy: false, studies: [c], priorStudies: [] }, pos: idx });
      return;
    }

    const grp = patientMap.get(normMrn) || [];
    grp.push(c);
    patientMap.set(normMrn, grp);
  });

  const consolidated: { item: PacsStudyResult; pos: number }[] = [];

  for (const group of patientMap.values()) {
    if (group.length === 1) {
      const single = group[0];
      const pos = cases.indexOf(single);
      consolidated.push({
        item: {
          ...single,
          isMultiStudy: false,
          duplicateCount: 1,
          studies: [single],
          priorStudies: [],
        },
        pos: pos !== -1 ? pos : 0,
      });
      continue;
    }

    // Cluster this patient's studies into clinical encounters
    const clusters = clusterPatientStudiesIntoEncounters(group, cases);

    for (const cluster of clusters) {
      const diagnosticInCluster = cluster.studies.filter((s) => !s.isFilmCharges);
      const hasDiagnostic = diagnosticInCluster.length > 0;

      // Filter displayed studies based on hideFilmCharges
      let displayStudies: PacsStudyResult[];
      if (hideFilmCharges && hasDiagnostic) {
        displayStudies = diagnosticInCluster;
        if (explicitSearchQuery) {
          const matchingFilms = cluster.studies.filter(
            (s) => s.isFilmCharges && s.accessionNumber.toLowerCase().includes(explicitSearchQuery.toLowerCase())
          );
          if (matchingFilms.length > 0) {
            displayStudies = [...diagnosticInCluster, ...matchingFilms];
          }
        }
      } else {
        displayStudies = cluster.studies;
      }

      const candidateGroup = hasDiagnostic ? diagnosticInCluster : cluster.studies;

      // Select primary study within encounter: STAT > active drafts > active scheduled > final
      const sortedCandidates = [...candidateGroup].sort((a, b) => {
        const statA = a.priority === 'stat' ? 1 : 0;
        const statB = b.priority === 'stat' ? 1 : 0;
        if (statA !== statB) return statB - statA;

        const weightA = getStudyStatusWeight(a.status);
        const weightB = getStudyStatusWeight(b.status);
        if (weightA !== weightB) return weightB - weightA;

        const tA = getStudyTimestamp(a);
        const tB = getStudyTimestamp(b);
        if (tA !== tB) return tB - tA;

        return b.accessionNumber.localeCompare(a.accessionNumber);
      });

      const primary = sortedCandidates[0] || cluster.studies[0];

      const isStat = displayStudies.some((s) => s.priority === 'stat');
      const hasCritical = displayStudies.some((s) => Boolean(s.criticalFinding));
      const anyHasImages = displayStudies.some((s) => Boolean(s.hasImages));

      const totalInstances = displayStudies.reduce((sum, s) => sum + (s.numInstances || 0), 0);
      const totalSeries = displayStudies.reduce((sum, s) => sum + (s.numSeries || 0), 0);

      // Same-encounter companion studies (e.g. Cervical + Lumbar ordered together)
      const companionStudies = displayStudies
        .filter((s) => s.accessionNumber.toUpperCase() !== primary.accessionNumber.toUpperCase())
        .map((s) => ({
          accessionNumber: s.accessionNumber,
          studyDescription: s.studyDescription || s.scanType || 'Diagnostic Study',
          status: s.status,
          modality: s.modality,
          studyDate: s.studyDate,
          isFilmCharges: s.isFilmCharges,
        }));

      // Prior studies: Diagnostic examinations from earlier encounters
      const priors: PacsStudyResult[] = [];
      for (const otherCluster of clusters) {
        if (otherCluster === cluster) continue;
        const isEarlier =
          otherCluster.maxTime < cluster.minTime ||
          (otherCluster.minTime === 0 && otherCluster.studies[0]?.studyDate < cluster.studies[0]?.studyDate);
        if (isEarlier) {
          for (const s of otherCluster.studies) {
            if (!s.isFilmCharges && !priors.some((p) => p.accessionNumber.toUpperCase() === s.accessionNumber.toUpperCase())) {
              priors.push(s);
            }
          }
        }
      }

      const priorSummaries = priors.map((p) => ({
        accessionNumber: p.accessionNumber,
        studyDescription: p.studyDescription || p.scanType || 'Diagnostic Study',
        status: p.status,
        modality: p.modality,
        studyDate: p.studyDate,
        reportId: p.reportId,
      }));

      consolidated.push({
        item: {
          ...primary,
          isMultiStudy: displayStudies.length > 1,
          duplicateCount: displayStudies.length,
          priority: isStat ? 'stat' : primary.priority,
          criticalFinding: hasCritical,
          hasImages: anyHasImages,
          numInstances: totalInstances || primary.numInstances,
          numSeries: totalSeries || primary.numSeries,
          studies: displayStudies,
          companionStudies,
          priorStudies: priorSummaries,
          diagnosisHighlight: primary.diagnosisHighlight || displayStudies.find((s) => s.diagnosisHighlight)?.diagnosisHighlight,
        },
        pos: cluster.minPos,
      });
    }
  }

  // Preserve initial sorted order based on the position in original cases
  const allConsolidated = [...consolidated, ...unlinkedCases];
  allConsolidated.sort((a, b) => a.pos - b.pos);

  return allConsolidated.map((entry) => entry.item);
}
