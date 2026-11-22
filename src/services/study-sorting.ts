import type { PacsStudyResult } from '@/types/pacs';

/**
 * Parses studyDate and studyTime into epoch milliseconds for reliable comparison.
 * Supports ISO 8601 strings, standard dates, and DICOM YYYYMMDD / HHMMSS formats.
 */
export function parseStudyTimestamp(studyDate?: string | Date | null, studyTime?: string | null): number {
  if (!studyDate) return 0;
  if (studyDate instanceof Date) {
    return isNaN(studyDate.getTime()) ? 0 : studyDate.getTime();
  }
  const str = String(studyDate).trim();
  if (!str) return 0;

  // Handle standard slash dates (e.g. DD/MM/YY or DD/MM/YYYY with optional time like 12/10/26 8:13:00 PM)
  if (str.includes('/')) {
    const parts = str.split(/[/ :]/);
    if (parts.length >= 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let p2 = parseInt(parts[2], 10);
      if (p2 < 100) p2 += 2000;
      if (p0 <= 31 && p1 <= 12) {
        let hh = 0, mm = 0, ss = 0;
        if (parts.length >= 5) {
          hh = parseInt(parts[3], 10) || 0;
          mm = parseInt(parts[4], 10) || 0;
          if (parts.length >= 6) ss = parseInt(parts[5], 10) || 0;
          if (/pm/i.test(str) && hh < 12) hh += 12;
          if (/am/i.test(str) && hh === 12) hh = 0;
        }
        const parsed = new Date(p2, p1 - 1, p0, hh, mm, ss).getTime();
        if (!isNaN(parsed)) return parsed;
      }
    }
  }

  if (str.includes('-') || str.includes('T')) {
    const parsed = new Date(str).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  if (str.length === 8 && /^\d{8}$/.test(str)) {
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(4, 6), 10) - 1;
    const d = parseInt(str.slice(6, 8), 10);
    let hh = 0, mm = 0, ss = 0;
    if (studyTime) {
      const cleanTime = String(studyTime).replace(/:/g, '');
      if (cleanTime.length >= 2) hh = parseInt(cleanTime.slice(0, 2), 10) || 0;
      if (cleanTime.length >= 4) mm = parseInt(cleanTime.slice(2, 4), 10) || 0;
      if (cleanTime.length >= 6) ss = parseInt(cleanTime.slice(4, 6), 10) || 0;
    }
    return new Date(y, m, d, hh, mm, ss).getTime();
  }

  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Sorts an array of PacsStudyResult items by requested column and direction.
 */
export function sortStudies(items: PacsStudyResult[], sortBy?: string, isPersonalQueue = false): PacsStudyResult[] {
  return items.sort((a, b) => {
    const aTime = isPersonalQueue
      ? (a.claimedAt ? parseStudyTimestamp(a.claimedAt) : 0) || parseStudyTimestamp(a.studyDate, a.studyTime)
      : parseStudyTimestamp(a.studyDate, a.studyTime) || (a.claimedAt ? parseStudyTimestamp(a.claimedAt) : 0);

    const bTime = isPersonalQueue
      ? (b.claimedAt ? parseStudyTimestamp(b.claimedAt) : 0) || parseStudyTimestamp(b.studyDate, b.studyTime)
      : parseStudyTimestamp(b.studyDate, b.studyTime) || (b.claimedAt ? parseStudyTimestamp(b.claimedAt) : 0);

    switch (sortBy) {
      case 'date_asc':
        return aTime - bTime;
      case 'date_desc':
        return bTime - aTime;
      case 'accession_asc':
        return (a.accessionNumber || '').localeCompare(b.accessionNumber || '', undefined, { numeric: true });
      case 'accession_desc':
        return (b.accessionNumber || '').localeCompare(a.accessionNumber || '', undefined, { numeric: true });
      case 'patient_name_asc':
      case 'patient_name':
        return (a.patientName || '').localeCompare(b.patientName || '');
      case 'patient_name_desc':
        return (b.patientName || '').localeCompare(a.patientName || '');
      case 'modality_asc':
        return (a.modality || '').localeCompare(b.modality || '');
      case 'modality_desc':
        return (b.modality || '').localeCompare(a.modality || '');
      case 'status_asc':
        return (a.status || '').localeCompare(b.status || '');
      case 'status_desc':
        return (b.status || '').localeCompare(a.status || '');
      case 'source_asc':
        return (a.source || '').localeCompare(b.source || '');
      case 'source_desc':
        return (b.source || '').localeCompare(a.source || '');
      case 'priority':
      case 'priority_desc': {
        const aStat = a.priority === 'stat' ? 1 : 0;
        const bStat = b.priority === 'stat' ? 1 : 0;
        if (aStat !== bStat) return bStat - aStat;
        return bTime - aTime;
      }
      case 'priority_asc': {
        const aStat = a.priority === 'stat' ? 1 : 0;
        const bStat = b.priority === 'stat' ? 1 : 0;
        if (aStat !== bStat) return aStat - bStat;
        return bTime - aTime;
      }
      default:
        return bTime - aTime;
    }
  });
}
