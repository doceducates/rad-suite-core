import type { LocalResidentStudy } from '@/services/clinic-node.service';
import type { UnifiedPatientStudy } from './clinic-patient-row';

/**
 * Merges local sandbox studies, synced telemetry studies, and live PACS scanner results
 * into a single unified patient catalog.
 */
export function buildUnifiedCatalog(
  localStudies: LocalResidentStudy[] = [],
  syncedStudies: any[] = [],
  queriedPacsStudies: UnifiedPatientStudy[] = []
): UnifiedPatientStudy[] {
  const map = new Map<string, UnifiedPatientStudy>();

  // 1. Add all Local Resident Sandbox Studies (ensures 100% of Medical Sandbox is present)
  for (const ls of localStudies) {
    if (!ls.accession) continue;
    const accClean = ls.accession.toUpperCase().trim();
    const isSynced = ls.isSyncedToS3 || ls.state === 'synced';
    map.set(accClean, {
      id: ls.studyId || accClean,
      patientName: ls.patientName || 'PATIENT',
      patientId: ls.patientId || '',
      patientMrn: ls.patientId,
      accessionNumber: accClean,
      studyDate: ls.studyDate || '',
      studyTime: ls.studyTime || ls.time || '',
      modality: ls.modality || 'MR',
      studyDescription: ls.studyDescription || '',
      numInstances: ls.sliceCount || 0,
      numSeries: ls.seriesCount || ls.numSeries || 1,
      s3Status: isSynced ? 'synced' : (ls.state || 'local_only'),
      location: 'sandbox',
      hasLocalSeries: true,
      sizeMb: ls.sizeMb,
    });
  }

  // 2. Merge Synced Studies from Node Telemetry
  for (const ss of syncedStudies) {
    const accClean = (ss.accession || '').toUpperCase().trim();
    if (!accClean) continue;
    const existing = map.get(accClean);
    if (existing) {
      existing.s3Status = 'synced';
    } else {
      map.set(accClean, {
        id: ss.id || accClean,
        patientName: ss.patientName || 'PATIENT',
        patientId: ss.patientId || '',
        patientMrn: ss.patientId,
        accessionNumber: accClean,
        studyDate: ss.studyDate || '',
        studyTime: ss.studyTime || ss.time || '',
        modality: ss.modality || 'MR',
        studyDescription: ss.studyDescription || ss.description || '',
        numInstances: ss.sliceCount || ss.numInstances || 0,
        numSeries: ss.seriesCount || ss.numSeries || 1,
        s3Status: 'synced',
        location: 's3',
      });
    }
  }

  // 3. Merge any Live Queried Studies from Hospital PACS Scanner
  for (const qs of queriedPacsStudies) {
    const accClean = (qs.accessionNumber || '').toUpperCase().trim();
    if (!accClean) continue;
    if (!map.has(accClean)) {
      map.set(accClean, qs);
    }
  }

  return Array.from(map.values());
}

/**
 * Evaluates whether a study date string matches the selected preset or custom date range.
 * Supports ISO strings, YYYY-MM-DD, and DICOM YYYYMMDD formats.
 */
export function matchesStudyDate(
  studyDateStr?: string,
  preset: string = 'all',
  customFrom?: string,
  customTo?: string
): boolean {
  if (preset === 'all' && !customFrom && !customTo) return true;
  if (!studyDateStr) return false;

  let normalized = studyDateStr.trim();
  if (/^\d{8}$/.test(normalized)) {
    normalized = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
  }
  const studyTime = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00`).getTime();
  if (isNaN(studyTime)) return true;

  if (preset === 'custom' || customFrom || customTo) {
    if (customFrom) {
      const fromTime = new Date(customFrom.includes('T') ? customFrom : `${customFrom}T00:00:00`).getTime();
      if (!isNaN(fromTime) && studyTime < fromTime) return false;
    }
    if (customTo) {
      const toTime = new Date(customTo.includes('T') ? customTo : `${customTo}T23:59:59`).getTime();
      if (!isNaN(toTime) && studyTime > toTime) return false;
    }
    return true;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (preset === 'today') return studyTime >= todayStart;
  if (preset === 'yesterday') return studyTime >= todayStart - 86400000 && studyTime < todayStart;
  if (preset === '48h' || preset === 'shift') return studyTime >= todayStart - 86400000;
  if (preset === '7d' || preset === 'week') return studyTime >= todayStart - 7 * 86400000;
  if (preset === '30d' || preset === 'month') return studyTime >= todayStart - 30 * 86400000;

  return true;
}
