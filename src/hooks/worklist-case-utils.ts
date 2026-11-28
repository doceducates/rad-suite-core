import type { PacsStudyResult } from '@/types/pacs';
import type { AdvancedFilterValues } from '@/components/worklist/worklist-advanced-drawer';

export const defaultAdvancedFilters: AdvancedFilterValues = {
  dateRange: 'shift', // Default to last 48 hours (active shift)
  dateFrom: '',
  dateTo: '',
  bodyPart: 'all',
  gender: 'all',
  source: 'all',
  sortBy: 'date_desc',
  criticalOnly: false,
  imagesReadyOnly: false,
};

export function normalizeLegacyRows(rows?: any[]): PacsStudyResult[] {
  if (!rows || rows.length === 0) return [];
  return rows.map((r) => ({
    accessionNumber: r.study?.accessionNumber,
    patientName: r.patient?.fullName,
    patientMrn: r.patient?.mrNumber,
    patientId: r.patient?.mrNumber,
    age: r.patient?.age ?? 0,
    gender: r.patient?.gender || 'Male',
    dateOfBirth: r.patient?.dob,
    modality: r.study?.modality || 'CT',
    studyDescription: r.study?.scanType || 'Study',
    studyDate: r.study?.scheduledAt ? new Date(r.study.scheduledAt).toISOString() : new Date().toISOString(),
    studyTime: r.study?.scheduledAt ? new Date(r.study.scheduledAt).toTimeString().slice(0, 8) : undefined,
    numSeries: 1,
    numInstances: 1,
    pacsServerAe: 'DATABASE',
    studyInstanceUid: r.study?.id,
    source: 'worklist' as const,
    status: (r.report?.status || 'draft') as any,
    priority: (r.study?.priority || 'routine') as any,
    reportId: r.report?.id,
    studyId: r.study?.id,
    criticalFinding: Boolean(r.report?.criticalFinding),
  }));
}

export interface WorklistQueryParamsInput {
  searchQuery: string;
  statusFilter: string;
  modalityFilter: string;
  priorityFilter: string;
  sourceFilter: string;
  departmentFilter: string;
  advancedFilters: AdvancedFilterValues;
  tabFilter: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pageSize: number;
  currentPage: number;
  showFilmCharges?: boolean;
}

export function buildWorklistQueryParams(input: WorklistQueryParamsInput): URLSearchParams {
  const params = new URLSearchParams();
  if (input.searchQuery.trim()) params.set('query', input.searchQuery.trim());
  if (input.statusFilter !== 'all') params.set('status', input.statusFilter);
  if (input.modalityFilter !== 'all') params.set('modality', input.modalityFilter);
  if (input.priorityFilter !== 'all') params.set('priority', input.priorityFilter);

  // Film charges default: hidden unless toggled on
  if (input.showFilmCharges) {
    params.set('hideFilmCharges', 'false');
  } else {
    params.set('hideFilmCharges', 'true');
  }

  const effectiveSource = input.advancedFilters.source !== 'all' ? input.advancedFilters.source : input.sourceFilter;
  if (effectiveSource !== 'all') params.set('source', effectiveSource);

  // When searching by accession, MRN, or identifier, search across all dates in local index
  const cleanQ = input.searchQuery.trim();
  const isSpecificSearch = /^\d{5,16}$/.test(cleanQ);

  if (isSpecificSearch) {
    params.set('dateRange', 'all');
  } else {
    if (input.advancedFilters.dateRange) params.set('dateRange', input.advancedFilters.dateRange);
    if (input.advancedFilters.dateFrom) params.set('dateFrom', input.advancedFilters.dateFrom);
    if (input.advancedFilters.dateTo) params.set('dateTo', input.advancedFilters.dateTo);
  }
  if (input.advancedFilters.bodyPart !== 'all') params.set('bodyPart', input.advancedFilters.bodyPart);
  if (input.advancedFilters.gender !== 'all') params.set('gender', input.advancedFilters.gender);
  if (input.advancedFilters.criticalOnly) params.set('criticalOnly', 'true');
  if (input.advancedFilters.imagesReadyOnly) params.set('imagesReadyOnly', 'true');

  const sortMap: Record<string, string> = {
    date: input.sortDirection === 'asc' ? 'date_asc' : 'date_desc',
    accession: input.sortDirection === 'asc' ? 'accession_asc' : 'accession_desc',
    patient: input.sortDirection === 'asc' ? 'patient_name_asc' : 'patient_name_desc',
    modality: input.sortDirection === 'asc' ? 'modality_asc' : 'modality_desc',
    status: input.sortDirection === 'asc' ? 'status_asc' : 'status_desc',
    source: input.sortDirection === 'asc' ? 'source_asc' : 'source_desc',
    priority: input.sortDirection === 'asc' ? 'priority_asc' : 'priority_desc',
  };
  const effectiveSortBy = sortMap[input.sortField] || input.advancedFilters.sortBy;
  if (effectiveSortBy && effectiveSortBy !== 'date_desc') {
    params.set('sortBy', effectiveSortBy);
  }

  if (input.departmentFilter !== 'all') params.set('department', input.departmentFilter);
  if (input.tabFilter === 'my_cases') params.set('assignedTo', 'me');
  if (input.tabFilter === 'unassigned') params.set('assignedTo', 'unassigned');
  if (input.tabFilter === 'discrepancy') params.set('discrepancyOnly', 'true');
  if (input.tabFilter === 'hmis') params.set('hmisOnly', 'true');
  if (input.tabFilter === 'archive') {
    params.set('dateRange', 'all');
  }

  params.set('limit', String(input.pageSize));
  params.set('page', String(input.currentPage));

  return params;
}

export function isPlainFilterObject(obj: unknown): obj is Record<string, any> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (
    'nativeEvent' in obj ||
    'target' in obj ||
    'currentTarget' in obj ||
    'preventDefault' in obj ||
    'stopPropagation' in obj ||
    '_reactName' in obj ||
    'nodeType' in obj
  ) {
    return false;
  }
  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
}

export function buildHmisSyncPayload(
  options: {
    modalityFilter: string;
    departmentFilter: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
  },
  customFilters?: Record<string, any> | unknown
): Record<string, any> {
  const safeCustomFilters = isPlainFilterObject(customFilters)
    ? Object.fromEntries(
        Object.entries(customFilters).filter(([_, v]) =>
          v !== null && v !== undefined &&
          (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ||
          (Array.isArray(v) && v.every((i) => typeof i === 'string' || typeof i === 'number')))
        )
      )
    : {};

  const now = new Date();
  const toYmd = (offsetDays: number = 0) =>
    new Date(now.getTime() - offsetDays * 86400000).toISOString().split('T')[0];

  const rawQuery = (options.searchQuery || safeCustomFilters.searchQuery || safeCustomFilters.query || '') as string;
  const hasIdentifierQuery = Boolean(rawQuery?.trim());

  // Invariant: Unfiltered harvest by default upon syncing so all proceeded patients enter the database.
  // Filtering (modality, body part, dates) happens locally in the UI worklist after scraping.
  // Specific portal filters are translated ONLY when targeting a specific MRN or Accession.
  const syncBody: Record<string, any> = {
    perPage: 100,
    fetchAllPages: true,
    maxPages: 10,
    bypassCache: true,
    ...safeCustomFilters,
  };

  if (hasIdentifierQuery) {
    const q = rawQuery.trim();
    if (/^\d{13,16}$/.test(q)) syncBody.mrn = q;
    else if (/^\d{8,12}$/.test(q)) syncBody.accession = q;
    else if (/^[a-zA-Z\s.]+$/.test(q)) syncBody.name = q;
    else syncBody.accession = q;

    // Check if accession encodes year and month: [Hospital:2][Year:2][Month:2][Seq:6]
    // e.g. 192609003949 -> 2026-09 (clamped to max 30 days for HMIS portal constraint)
    const accMatch = (syncBody.accession || '').match(/^\d{2}(\d{2})(\d{2})\d+$/);
    if (accMatch) {
      const yy = parseInt(accMatch[1], 10);
      const mm = parseInt(accMatch[2], 10);
      if (mm >= 1 && mm <= 12) {
        const fullYear = 2000 + yy;
        const monthStr = String(mm).padStart(2, '0');
        const lastDay = new Date(fullYear, mm, 0).getDate();
        const clampedDay = Math.min(lastDay, 30);
        syncBody.startDate = `${fullYear}-${monthStr}-01`;
        syncBody.endDate = `${fullYear}-${monthStr}-${String(clampedDay).padStart(2, '0')}`;
      }
    } else {
      // Searching MRN or patient name: enforce HMIS portal's max 30-day window constraint
      if (!syncBody.startDate || !syncBody.endDate) {
        syncBody.startDate = toYmd(29);
        syncBody.endDate = toYmd(0);
      } else {
        const start = new Date(syncBody.startDate);
        const end = new Date(syncBody.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const inclusiveDays = Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          if (inclusiveDays > 30) {
            const clampedEnd = new Date(start.getTime() + 29 * 24 * 60 * 60 * 1000);
            syncBody.endDate = clampedEnd.toISOString().split('T')[0];
          }
        }
      }
    }
  }

  return syncBody;
}

// Re-export client API execution actions
export * from './worklist-actions';

