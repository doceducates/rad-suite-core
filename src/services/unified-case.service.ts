// Layer 2 (Domain/Services): Central Case Registry & Ingestion Service
import { getLocalCases, getLocalCaseById, LocalCaseStudy } from './local-cases.service';

function shouldScanLocalCases(): boolean {
  if (process.env.IS_DESKTOP === '1' || process.env.NODE_ENV === 'test') return true;
  if (process.env.CASES_DIR || process.env.LOCAL_CASES_DIR) return true;
  return process.platform === 'win32';
}
import { getTombstonedAccessions } from './case-deletion.service';
import { getHospitalPacsStudiesMap } from './hospital-pacs-index.service';
import { sortStudies } from './study-sorting';
import { consolidatePatientStudies } from './unified-case-grouping';
import { markCompanionStudies, computeWorklistStats, getDbStudiesMap } from './unified-case-stats';
import { safeIsoString, parseDateSafely } from '@/lib/date-utils';
import type { PacsQueryFilter, PacsStudyResult } from '@/types/pacs';
import {
  matchesModality,
  matchesDate,
  matchesText,
  matchesStatus,
  matchesPriority,
  matchesBodyPart,
  matchesGender,
  matchesCritical,
  matchesAssigned,
  matchesDepartment,
  matchesHmisOnly,
  isFilmChargesStudy,
  matchesFilmCharges,
  matchesImagesReady,
  extractSections,
  isPersonalQueueFilter,
  calculateAgeDiscrepancy,
} from './unified-case-filters';

export { syncLocalCasesToDatabase } from './case-sync.service';

export async function queryUnifiedCases(filter: PacsQueryFilter = {}): Promise<PacsStudyResult[]> {
  const effectiveFilter = filter.source ? filter : { ...filter, source: 'local_archive' as const };
  const { cases } = await getUnifiedWorklist(effectiveFilter);
  return cases;
}

export async function getUnifiedWorklist(filter: PacsQueryFilter = {}): Promise<{
  total: number;
  cases: PacsStudyResult[];
  stats: {
    total: number;
    statCount: number;
    scheduledCount: number;
    draftCount: number;
    finalCount: number;
    prelimCount: number;
    submittedCount: number;
    amendedCount: number;
    myCount: number;
    unassignedCount: number;
    hmisCount: number;
    erCount: number;
    opdCount: number;
    wardCount: number;
    filmChargesHiddenCount: number;
  };
}> {
  const [dbMap, tombstoned, pacsMap] = await Promise.all([
    getDbStudiesMap(),
    getTombstonedAccessions(),
    getHospitalPacsStudiesMap(),
  ]);

  const allCases: PacsStudyResult[] = [];
  const seenAccessions = new Set<string>();

  const isDicomArchiveView = filter.source === 'local_archive' || filter.source === 'local';

  // Index local PACS DICOM cases only when running on Desktop/local mode or explicitly requested
  const localCasesMap = new Map<string, LocalCaseStudy>();
  if (isDicomArchiveView || shouldScanLocalCases()) {
    try {
      for (const c of getLocalCases()) {
        if (c.accessionNumber) localCasesMap.set(c.accessionNumber.toLowerCase(), c);
      }
    } catch {}
  }

  if (isDicomArchiveView) {
    // 1. DICOM Archive View (/pacs): Gather all physical DICOM folders from E:\Cases
    const local = getLocalCases();
    for (const c of local) {
      const accNorm = c.accessionNumber.toUpperCase();
      const explicitTarget = (filter.query || filter.accessionNumber || '').trim().toUpperCase();
      if (tombstoned.has(accNorm) && (!explicitTarget || !accNorm.includes(explicitTarget))) continue;

      const accLower = c.accessionNumber.toLowerCase();
      if (seenAccessions.has(accLower)) continue;
      const dbEntry = dbMap.get(accLower);

      const localAgeMeta = calculateAgeDiscrepancy(
        dbEntry?.patient?.age ?? c.age,
        dbEntry?.patient?.dicomAge ?? c.age,
        dbEntry?.patient?.hmisAge,
        dbEntry?.patient?.ageSource
      );

      const study: PacsStudyResult = {
        accessionNumber: dbEntry?.study?.accessionNumber || c.accessionNumber,
        patientName: dbEntry?.patient?.fullName || c.patientName,
        patientMrn: dbEntry?.patient?.mrNumber || c.patientId,
        patientId: dbEntry?.patient?.mrNumber || c.patientId,
        age: dbEntry?.patient?.age ?? c.age,
        dicomAge: localAgeMeta.dicomAge,
        hmisAge: localAgeMeta.hmisAge,
        ageDiscrepancy: localAgeMeta.ageDiscrepancy,
        ageSource: localAgeMeta.ageSource,
        gender: dbEntry?.patient?.gender || c.gender,
        dateOfBirth: dbEntry?.patient?.dob || c.dateOfBirth,
        cnic: dbEntry?.patient?.cnic || undefined,
        examId: c.examId,
        modality: dbEntry?.study?.modality || (c.modality === 'MR' ? 'MRI' : c.modality),
        studyDescription: dbEntry?.study?.scanType || c.studyDescription,
        studyDate: dbEntry?.study?.scheduledAt ? safeIsoString(dbEntry.study.scheduledAt) : c.studyDate,
        studyTime: dbEntry?.study?.scheduledAt ? parseDateSafely(dbEntry.study.scheduledAt).toTimeString().slice(0, 8) : c.studyTime,
        numSeries: c.series.length,
        numInstances: c.numInstances,
        pacsServerAe: 'LOCAL_ARCHIVE',
        studyInstanceUid: c.studyInstanceUid,
        referringDoctor: dbEntry?.study?.referringDoctor || c.referringPhysician,
        technologist: (dbEntry?.study as any)?.technologist || undefined,
        source: 'local_archive',
        localCaseId: c.id,
        folderPath: c.folderPath,
        isDownloaded: true,
        hasImages: true,
        status: (dbEntry?.study as any)?.status === 'cancelled'
          ? 'cancelled'
          : ((dbEntry?.report?.status || (dbEntry?.study as any)?.status || 'scheduled') as any),
        priority: (dbEntry?.study?.priority || 'routine') as any,
        reportId: dbEntry?.report?.id,
        studyId: dbEntry?.study?.id,
        criticalFinding: Boolean(dbEntry?.report?.criticalFinding),
        assignedRadiologistId: dbEntry?.study?.assignedRadiologistId || null,
        claimedAt: dbEntry?.study?.claimedAt ? safeIsoString(dbEntry.study.claimedAt) : null,
        department: (dbEntry?.study as any)?.department || '',
        room: (dbEntry?.study as any)?.room || '',
        patientPhone: dbEntry?.patient?.phone || undefined,
        phone: dbEntry?.patient?.phone || undefined,
        pendingReason: dbEntry?.report?.pendingReason || undefined,
        pendingNotes: dbEntry?.report?.pendingNotes || undefined,
        pendingAt: dbEntry?.report?.pendingAt ? safeIsoString(dbEntry.report.pendingAt) : undefined,
        pendingBy: dbEntry?.report?.pendingBy || undefined,
        hmisInvestigationId: (dbEntry?.study as any)?.hmisInvestigationId || undefined,
        hmisCpt: (dbEntry?.study as any)?.hmisCpt || undefined,
        hmisMilestonesJson: (dbEntry?.study as any)?.hmisMilestonesJson || undefined,
        hmisStatus: dbEntry?.study?.hmisStatus || null,
        hmisLastCheckedAt: dbEntry?.study?.hmisLastCheckedAt ? safeIsoString(dbEntry.study.hmisLastCheckedAt) : null,
        isManual: Boolean((dbEntry?.study as any)?.isManual || c.accessionNumber?.startsWith('MAN-')),
        scanType: dbEntry?.study?.scanType || c.studyDescription,
        bodyPart: (dbEntry?.study as any)?.bodyPart || undefined,
        clinicalHistory: dbEntry?.report?.clinicalHistory || (dbEntry?.study as any)?.clinicalHistory || undefined,
        isFilmCharges: isFilmChargesStudy(dbEntry?.study?.scanType || c.studyDescription, (dbEntry?.study as any)?.hmisCpt),
        ...extractSections(dbEntry?.report, dbEntry?.study),
      };
      allCases.push(study);
      seenAccessions.add(accLower);
    }
  } else {
    // 2. HMIS Patients Worklist: Ingest directly from HMIS database index
    for (const [accLower, entry] of dbMap.entries()) {
      if (seenAccessions.has(accLower)) continue;
      const { study: s, patient: p, report: r } = entry;
      const accNorm = s.accessionNumber.toUpperCase();
      const explicitTarget = (filter.query || filter.accessionNumber || '').trim().toUpperCase();
      if (tombstoned.has(accNorm) && (!explicitTarget || !accNorm.includes(explicitTarget))) continue;

      // Exclude unassigned orders with unknown hmis status that have no clinical activity
      const hasActivity = Boolean(s.assignedRadiologistId || s.claimedAt || r?.id || s.isManual || (s.status && s.status !== 'scheduled'));
      if (s.hmisStatus === 'unknown' && !hasActivity && !s.hmisInvestigationId) {
        continue;
      }

      const localMatch = localCasesMap.get(accLower), pacsMatch = pacsMap.get(accLower);
      const isS3Ready = pacsMatch?.s3Status === 'synced' || ((pacsMatch?.numInstances || 0) > 0 && pacsMatch?.s3Status !== 'not_uploaded');
      const hasImages = Boolean(localMatch || isS3Ready);

      const dbAgeMeta = calculateAgeDiscrepancy(
        p.age ?? 0,
        p.dicomAge ?? localMatch?.age ?? (pacsMatch as any)?.patientAge,
        p.hmisAge,
        p.ageSource
      );

      const study: PacsStudyResult = {
        accessionNumber: s.accessionNumber,
        patientName: p.fullName,
        patientMrn: p.mrNumber,
        patientId: p.mrNumber,
        age: p.age ?? 0,
        dicomAge: dbAgeMeta.dicomAge,
        hmisAge: dbAgeMeta.hmisAge,
        ageDiscrepancy: dbAgeMeta.ageDiscrepancy,
        ageSource: dbAgeMeta.ageSource,
        gender: p.gender || 'Male',
        dateOfBirth: p.dob || undefined,
        cnic: p.cnic || undefined,
        examId: undefined,
        modality: s.modality || (pacsMatch ? 'MR' : 'CT'),
        studyDescription: s.scanType || (s as any).hmisCpt || 'Diagnostic Exam',
        studyDate: s.scheduledAt && s.scheduledAt !== '0'
          ? safeIsoString(s.scheduledAt)
          : (s.claimedAt ? safeIsoString(s.claimedAt) : (s.createdAt ? safeIsoString(s.createdAt) : '')),
        studyTime: s.scheduledAt && s.scheduledAt !== '0' ? parseDateSafely(s.scheduledAt).toTimeString().slice(0, 8) : undefined,
        numSeries: localMatch ? localMatch.series.length : (pacsMatch?.numSeries || 0),
        numInstances: localMatch ? localMatch.numInstances : (pacsMatch?.numInstances || 0),
        pacsServerAe: localMatch ? 'LOCAL_ARCHIVE' : (isS3Ready ? 'S3_STORAGE' : 'HMIS_GATEWAY'),
        studyInstanceUid: localMatch?.studyInstanceUid || pacsMatch?.studyInstanceUid || s.id,
        referringDoctor: s.referringDoctor || undefined,
        technologist: (s as any)?.technologist || undefined,
        source: 'hmis',
        hasImages,
        isDownloaded: hasImages,
        folderPath: localMatch?.folderPath,
        localCaseId: localMatch?.id,
        status: s.status === 'cancelled' ? 'cancelled' : ((r?.status || s.status || 'scheduled') as any),
        priority: (s.priority || 'routine') as any,
        reportId: r?.id,
        studyId: s.id,
        criticalFinding: Boolean(r?.criticalFinding),
        assignedRadiologistId: s.assignedRadiologistId || null,
        claimedAt: s.claimedAt ? safeIsoString(s.claimedAt) : null,
        department: (s as any)?.department || '',
        room: (s as any)?.room || '',
        patientPhone: p.phone || undefined,
        phone: p.phone || undefined,
        pendingReason: r?.pendingReason || undefined,
        pendingNotes: r?.pendingNotes || undefined,
        pendingAt: r?.pendingAt ? safeIsoString(r.pendingAt) : undefined,
        pendingBy: r?.pendingBy || undefined,
        hmisInvestigationId: (s as any)?.hmisInvestigationId || undefined,
        hmisCpt: (s as any)?.hmisCpt || s.scanType || undefined,
        hmisMilestonesJson: (s as any)?.hmisMilestonesJson || undefined,
        hmisStatus: s.hmisStatus || 'awaiting_report',
        hmisLastCheckedAt: s.hmisLastCheckedAt ? safeIsoString(s.hmisLastCheckedAt) : null,
        isManual: Boolean((s as any)?.isManual || s.accessionNumber?.startsWith('MAN-')),
        scanType: s.scanType || undefined,
        bodyPart: (s as any)?.bodyPart || undefined,
        clinicalHistory: r?.clinicalHistory || (s as any)?.clinicalHistory || undefined,
        isFilmCharges: isFilmChargesStudy(s.scanType, (s as any)?.hmisCpt),
        ...extractSections(r, s),
      };
      allCases.push(study);
      seenAccessions.add(accLower);
    }
  }

  // 3. Multi-Study Patient Linking & Global Counts
  markCompanionStudies(allCases);
  const stats = computeWorklistStats(allCases, filter);

  const shouldHideFilmCharges = filter.hideFilmCharges !== false;
  // Group multiple studies of the same patient into a single consolidated row unless requested per-study
  const baseCases = filter.groupBy === 'study'
    ? allCases
    : consolidatePatientStudies(allCases, shouldHideFilmCharges, filter.query || filter.accessionNumber);

  const hasSpecificSearch = Boolean(
    (filter.query && filter.query.trim().length > 0) ||
    (filter.accessionNumber && filter.accessionNumber.trim().length > 0) ||
    (filter.patientMrn && filter.patientMrn.trim().length > 0)
  );
  const isIdentifierSearch = Boolean(
    (filter.accessionNumber && filter.accessionNumber.trim().length > 0) ||
    (filter.patientMrn && filter.patientMrn.trim().length > 0) ||
    (filter.query && /^\d{5,16}$/.test(filter.query.trim()))
  );

  // Filter cases (evaluating against consolidated patient encounter)
  let filtered = baseCases.filter((c) =>
    matchesModality(c.modality, filter.modality, isIdentifierSearch) &&
    matchesDate(c.studyDate, filter, c.claimedAt, isIdentifierSearch) &&
    matchesText(c, filter.query || filter.patientName || filter.accessionNumber || filter.patientMrn) &&
    matchesStatus(c, filter.status) &&
    matchesPriority(c, filter.priority) &&
    matchesBodyPart(c, filter.bodyPart) &&
    matchesGender(c, filter.gender) &&
    matchesCritical(c, filter.criticalOnly) &&
    matchesAssigned(c, filter.assignedTo, filter.currentUserId) &&
    matchesDepartment(c.department, filter.department) &&
    matchesHmisOnly(c, filter.hmisOnly) &&
    matchesImagesReady(c, (filter as any).imagesReadyOnly) &&
    matchesFilmCharges(c, filter.hideFilmCharges, hasSpecificSearch, filter.query || filter.accessionNumber) &&
    (!(filter as any).room || ((c as any).room || '').toLowerCase().includes(String((filter as any).room).toLowerCase())) &&
    (!(filter as any).cpt || ((c as any).hmisCpt || c.studyDescription || '').toLowerCase().includes(String((filter as any).cpt).toLowerCase()))
  );

  // Smart Search Fallback: If searching by patient/case name yields 0 results under active date preset,
  // automatically search across all dates so prior or recent examinations are immediately surfaced.
  if (filtered.length === 0 && hasSpecificSearch && filter.dateRange && filter.dateRange !== 'all') {
    filtered = baseCases.filter((c) =>
      matchesModality(c.modality, filter.modality, true) &&
      matchesText(c, filter.query || filter.patientName || filter.accessionNumber || filter.patientMrn) &&
      matchesStatus(c, filter.status) &&
      matchesPriority(c, filter.priority) &&
      matchesBodyPart(c, filter.bodyPart) &&
      matchesGender(c, filter.gender) &&
      matchesCritical(c, filter.criticalOnly) &&
      matchesAssigned(c, filter.assignedTo, filter.currentUserId) &&
      matchesDepartment(c.department, filter.department) &&
      matchesHmisOnly(c, filter.hmisOnly) &&
      matchesImagesReady(c, (filter as any).imagesReadyOnly) &&
      matchesFilmCharges(c, filter.hideFilmCharges, hasSpecificSearch, filter.query || filter.accessionNumber)
    );
  }

  const isPersonalQueue = isPersonalQueueFilter(filter);

  // Sort according to requested order
  sortStudies(filtered, filter.sortBy, isPersonalQueue);

  const total = filtered.length;
  let cases = filtered;

  if (filter.limit && filter.limit > 0) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const offset = (page - 1) * filter.limit;
    cases = filtered.slice(offset, offset + filter.limit);
  }

  return { total, cases, stats };
}

export function getUnifiedCase(idOrAccession: string): LocalCaseStudy | PacsStudyResult | undefined {
  return getLocalCaseById(idOrAccession);
}
