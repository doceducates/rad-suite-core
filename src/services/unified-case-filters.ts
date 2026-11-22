// Layer 2 (Domain/Services): Pure Filter Predicates for Unified Cases
import type { PacsQueryFilter, PacsStudyResult } from '@/types/pacs';
import { parseStudyTimestamp } from './study-sorting';
import { extractDiagnosisHighlight } from '@/lib/clinical-summary';

export function matchesModality(studyMod: string, filterMod?: string, isIdentifierSearch?: boolean): boolean {
  if (isIdentifierSearch) return true;
  if (!filterMod || filterMod.toLowerCase() === 'all') return true;
  const sm = studyMod.toUpperCase();
  const fm = filterMod.toUpperCase();
  if (sm === fm) return true;
  if ((fm === 'MRI' || fm === 'MR') && (sm === 'MRI' || sm === 'MR')) return true;
  if ((fm === 'CR' || fm === 'DX' || fm === 'XR') && (sm === 'CR' || sm === 'DX' || sm === 'XR')) return true;
  return false;
}

export function isPersonalQueueFilter(filter?: PacsQueryFilter): boolean {
  if (!filter) return false;
  return (
    filter.assignedTo === 'me' ||
    (Boolean(filter.assignedTo) &&
      filter.assignedTo !== 'all' &&
      filter.assignedTo !== 'unassigned' &&
      Boolean(filter.currentUserId) &&
      filter.assignedTo?.toLowerCase() === filter.currentUserId?.toLowerCase())
  );
}

export function matchesDate(
  studyDateStr: string,
  filter: PacsQueryFilter,
  claimedAtStr?: string | null,
  isIdentifierSearch?: boolean
): boolean {
  if (isIdentifierSearch) return true;
  if (!filter.dateRange || filter.dateRange === 'all') return true;

  const studyTime = parseStudyTimestamp(studyDateStr);
  const claimTime = claimedAtStr ? parseStudyTimestamp(claimedAtStr) : 0;

  // Personal Queue ("My Cases"):
  // The clinician arranges this queue by the date/time they took up the case (claimedAt).
  // Older cases taken up during the active shift window are included.
  // General Worklist / HMIS Patients / PACS:
  // Evaluates strictly against patient examination/study date on HMIS portal.
  const isPersonalQueue = isPersonalQueueFilter(filter);
  const time = isPersonalQueue ? (claimTime || studyTime) : (studyTime || claimTime);
  if (!time || isNaN(time)) return true;

  // Custom date range takes precedence when specified
  if (filter.dateRange === 'custom' || filter.dateFrom || filter.dateTo) {
    if (filter.dateFrom) {
      const fromStr = filter.dateFrom.includes('T') ? filter.dateFrom : filter.dateFrom + 'T00:00:00';
      const fromTime = new Date(fromStr).getTime();
      if (!isNaN(fromTime) && time < fromTime) return false;
    }
    if (filter.dateTo) {
      const toStr = filter.dateTo.includes('T') ? filter.dateTo : filter.dateTo + 'T23:59:59';
      const toTime = new Date(toStr).getTime();
      if (!isNaN(toTime) && time > toTime) return false;
    }
    if (filter.dateRange === 'custom') return true;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (filter.dateRange === 'today') return time >= todayStart;
  if (filter.dateRange === 'yesterday') return time >= todayStart - 86400000 && time < todayStart;
  if (filter.dateRange === 'shift' || filter.dateRange === 'recent' || filter.dateRange === '48h') return time >= todayStart - 86400000;
  if (filter.dateRange === 'week' || filter.dateRange === '7d') return time >= todayStart - 7 * 86400000;
  if (filter.dateRange === 'month' || filter.dateRange === '30d') return time >= todayStart - 30 * 86400000;

  return true;
}

export function matchesText(study: PacsStudyResult, q?: string): boolean {
  if (!q || !q.trim()) return true;
  const clean = q.trim().toLowerCase();
  const directMatch = Boolean(
    (study.accessionNumber && study.accessionNumber.toLowerCase().includes(clean)) ||
    (study.patientName && study.patientName.toLowerCase().includes(clean)) ||
    (study.patientMrn && study.patientMrn.toLowerCase().includes(clean)) ||
    (study.patientId && study.patientId.toLowerCase().includes(clean)) ||
    (study.examId && study.examId.toLowerCase().includes(clean)) ||
    (study.studyDescription && study.studyDescription.toLowerCase().includes(clean)) ||
    (study.studies && study.studies.some((s) =>
      (s.accessionNumber && s.accessionNumber.toLowerCase().includes(clean)) ||
      (s.studyDescription && s.studyDescription.toLowerCase().includes(clean))
    ))
  );
  if (directMatch) return true;

  // Fuzzy national MRN match: if both are 12+ digits and share the last 10 digits (ignoring hospital prefix variations)
  if (/^\d{12,16}$/.test(clean) && study.patientMrn && /^\d{12,16}$/.test(study.patientMrn)) {
    if (study.patientMrn.slice(-10) === clean.slice(-10)) {
      return true;
    }
  }

  return false;
}

export function matchesStatus(study: PacsStudyResult, filterStatus?: string): boolean {
  const s = (study.status || 'scheduled').toLowerCase();
  if (filterStatus === 'cancelled') return s === 'cancelled';
  if (s === 'cancelled') return false; // Retired/cancelled studies hidden unless explicitly requested
  if (!filterStatus || filterStatus === 'all') return true;
  if (filterStatus === 'scheduled' || filterStatus === 'awaiting_report') return s === 'scheduled' || s === 'awaiting_report';
  if (filterStatus === 'draft') return s === 'draft';
  if (filterStatus === 'preliminary') return s === 'preliminary';
  if (filterStatus === 'submitted') return s === 'submitted';
  if (filterStatus === 'final') return s === 'final' || s === 'finalized' || s === 'reported';
  if (filterStatus === 'amended') return s === 'amended';
  return s === filterStatus.toLowerCase();
}

export function matchesPriority(study: PacsStudyResult, filterPriority?: string): boolean {
  if (!filterPriority || filterPriority === 'all') return true;
  return (study.priority || 'routine').toLowerCase() === filterPriority.toLowerCase();
}

export function matchesBodyPart(study: PacsStudyResult, filterPart?: string): boolean {
  if (!filterPart || filterPart === 'all') return true;
  const combined = `${study.studyDescription || ''} ${(study as any).bodyPart || ''}`.toLowerCase();
  switch (filterPart.toLowerCase()) {
    case 'neuro':
    case 'brain':
      return /brain|head|cns|stroke|infarct|cranium|pituitary|neuro|skull/i.test(combined);
    case 'chest':
    case 'thorax':
      return /chest|thorax|lung|hrct|pulmonary|pe|pneumonia|pleural|cough|rib/i.test(combined);
    case 'abdomen':
    case 'pelvis':
      return /abdo|pelvi|liver|kub|kidney|renal|bowel|appendix|stone|gall|bladder/i.test(combined);
    case 'spine':
      return /spine|lumbar|cervical|dorsal|thoracic|l-spine|c-spine|d-spine|t-spine|disc|vertebra|whole spine|sacr/i.test(combined);
    case 'ls_spine':
    case 'lumbar':
    case 'l_spine':
      return /lumbar|ls spine|l-spine|l spine|lumbosacral/i.test(combined);
    case 'cervical':
    case 'c_spine':
      return /cervical|c-spine|c spine/i.test(combined);
    case 'thoracic':
    case 'dorsal':
    case 'd_spine':
    case 't_spine':
      return /thoracic|dorsal|d-spine|t-spine|d spine|t spine/i.test(combined);
    case 'whole_spine':
    case 'screening_spine':
      return /whole spine|screening spine|full spine/i.test(combined);
    case 'msk':
      return /knee|shoulder|hip|ankle|wrist|joint|fracture|bone|extremity|femur|tibia|elbow/i.test(combined);
    default:
      return combined.includes(filterPart.toLowerCase());
  }
}

export function matchesGender(study: PacsStudyResult, filterGender?: string): boolean {
  if (!filterGender || filterGender === 'all') return true;
  return (study.gender || '').toLowerCase() === filterGender.toLowerCase();
}

export function matchesCritical(study: PacsStudyResult, criticalOnly?: boolean): boolean {
  if (!criticalOnly) return true;
  return Boolean(study.criticalFinding);
}

export function isSameRadiologistUser(assignedId?: string | null, currentUserId?: string | null): boolean {
  if (!assignedId || !currentUserId) return false;
  const sId = assignedId.toLowerCase();
  const uId = currentUserId.toLowerCase();
  if (sId === uId) return true;
  // Dual ID alias support for Dr. Mudassir (local usr_admin_mudassir vs VPS UUID)
  return (
    (sId === 'usr_admin_mudassir' || sId === '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a' || sId === 'usr-admin-mudassir') &&
    (uId === 'usr_admin_mudassir' || uId === '9ce1c37b-22e7-4cdb-83ae-eb14e91fde8a' || uId === 'usr-admin-mudassir')
  );
}

export function matchesAssigned(study: PacsStudyResult, filterAssigned?: string, currentUserId?: string): boolean {
  if (!filterAssigned || filterAssigned === 'all') return true;
  if (filterAssigned === 'unassigned') return !study.assignedRadiologistId;
  if (filterAssigned === 'me') {
    return isSameRadiologistUser(study.assignedRadiologistId, currentUserId);
  }
  if (study.assignedRadiologistId && filterAssigned) {
    return isSameRadiologistUser(study.assignedRadiologistId, filterAssigned);
  }
  return false;
}

export function matchesDepartment(studyDept?: string, filterDept?: string): boolean {
  if (!filterDept || filterDept.toLowerCase() === 'all') return true;
  const sd = (studyDept || '').toLowerCase();
  const fd = filterDept.toLowerCase();
  if (fd === 'er' || fd === 'emergency') {
    return sd.includes('emerg') || sd.includes('er') || sd.includes('trauma') || sd.includes('casualty');
  }
  if (fd === 'opd' || fd === 'outpatient') {
    return sd.includes('opd') || sd.includes('outpatient') || sd.includes('clinic');
  }
  if (fd === 'ward' || fd === 'indoor' || fd === 'inpatient') {
    return sd.includes('ward') || sd.includes('indoor') || sd.includes('inpatient') || sd.includes('icu') || sd.includes('ccu');
  }
  return sd.includes(fd);
}

export function matchesHmisOnly(study: PacsStudyResult, hmisOnly?: boolean): boolean {
  if (!hmisOnly) return true;
  return Boolean(study.hmisStatus && study.hmisStatus !== 'unknown' && study.hmisStatus !== 'not_found');
}

export function isFilmChargesStudy(studyDescription?: string, cpt?: string): boolean {
  const text = `${studyDescription || ''} ${cpt || ''}`.trim();
  if (!text) return false;
  return /film\s*charge|charges?\s*(for)?\s*film|printing\s*charge|cd\s*charge/i.test(text);
}

export function matchesFilmCharges(
  study: PacsStudyResult,
  hideFilmCharges?: boolean,
  hasExplicitSearch?: boolean,
  explicitTarget?: string
): boolean {
  // Only show film charges when user explicitly unchecks / sets hideFilmCharges === false (e.g. Bills button clicked)
  if (hideFilmCharges === false) {
    return true;
  }
  // Diagnostic examinations are never hidden by this filter
  if (!study.isFilmCharges) {
    return true;
  }
  // If user explicitly searched directly for this specific film charge accession number or active query
  if (hasExplicitSearch) {
    return true;
  }
  if (explicitTarget && study.accessionNumber.toLowerCase().includes(explicitTarget.toLowerCase().trim())) {
    return true;
  }
  // Otherwise, administrative film charges remain hidden by default to keep the worklist pristine
  return false;
}

export function matchesImagesReady(study: PacsStudyResult, imagesReadyOnly?: boolean): boolean {
  if (!imagesReadyOnly) return true;
  return Boolean(
    study.hasImages ||
    Boolean(study.folderPath) ||
    study.isDownloaded === true ||
    (typeof study.numInstances === 'number' && study.numInstances > 1)
  );
}

function isFilledText(val?: any): boolean {
  if (!val) return false;
  return String(val)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160|#xa0|ZeroWidthSpace|#8203);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0;
}

export function extractSections(reportObj?: any, studyObj?: any) {
  const hasHistory = isFilledText(reportObj?.clinicalHistory) || isFilledText(studyObj?.clinicalHistory);
  const hasFindings = isFilledText(reportObj?.findings);
  const hasImpression = isFilledText(reportObj?.impression);
  const rawImpression = reportObj?.impression || '';
  const diagnosisHighlight = rawImpression ? extractDiagnosisHighlight(rawImpression) : undefined;
  return {
    reportSections: { history: hasHistory, findings: hasFindings, impression: hasImpression },
    hasClinicalHistory: hasHistory,
    hasFindings,
    hasImpression,
    impression: rawImpression || undefined,
    diagnosisHighlight,
  };
}

export function calculateAgeDiscrepancy(
  effectiveAge: number,
  dicomCandidate?: number | null,
  hmisCandidate?: number | null,
  source?: string | null
) {
  const dicomAge = dicomCandidate ?? (effectiveAge > 0 ? effectiveAge : null);
  const hmisAge = hmisCandidate ?? null;
  const ageDiscrepancy = Boolean(
    dicomAge &&
    hmisAge &&
    (Math.abs(dicomAge - hmisAge) >= 3 || (dicomAge < 18 !== hmisAge < 18))
  );
  return {
    dicomAge,
    hmisAge,
    ageDiscrepancy,
    ageSource: (source || 'dicom') as 'dicom' | 'hmis' | 'manual',
  };
}


