/**
 * Centralized Table Filter State Persistence
 *
 * Persists high-value clinical filters (Modality, Date Range / Shift, Department, Status, etc.)
 * across page reloads and tab navigation.
 *
 * HIPAA & CLINICAL SAFETY INVARIANT:
 * Free-text search terms, patient names, MR numbers, and accession numbers are strictly EXCLUDED
 * from persistence to prevent stale search blindspots and ensure zero PHI in browser storage.
 */

export interface WorklistSavedFilters {
  tabFilter?: 'all' | 'my_cases' | 'unassigned' | 'discrepancy' | 'hmis' | 'archive';
  departmentFilter?: 'all' | 'er' | 'opd' | 'ward';
  statusFilter?: string;
  modalityFilter?: string;
  priorityFilter?: string;
  sourceFilter?: string;
  showFilmCharges?: boolean;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  advancedFilters?: {
    dateRange?: string;
    dateFrom?: string;
    dateTo?: string;
    bodyPart?: string;
    gender?: string;
    source?: string;
    sortBy?: string;
    criticalOnly?: boolean;
    imagesReadyOnly?: boolean;
  };
}

export interface MyCasesSavedFilters {
  modality?: string;
  status?: string;
  priority?: string;
  department?: string;
  bodyPart?: string;
  dateRange?: string;
  customFrom?: string;
  customTo?: string;
  imagesReadyOnly?: boolean;
  showFilmCharges?: boolean;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PacsSavedFilters {
  modality?: string;
  region?: string;
  datePreset?: '48h' | 'today' | 'yesterday' | '7d' | '30d' | 'all' | 'custom';
  customFrom?: string;
  customTo?: string;
  location?: string;
  searchField?: 'all' | 'accession' | 'mrn' | 'name' | 'description';
  pageSize?: number;
}

export interface PacsQuerySavedFilters {
  modality?: string;
  dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  source?: 'all' | 'local' | 'pacs';
}

export interface PatientRecordsSavedFilters {
  modalityFilter?: string;
  statusFilter?: string;
  datePreset?: string;
  customFrom?: string;
  customTo?: string;
  sortField?: 'date' | 'name' | 'modality' | 'status';
  sortDir?: 'asc' | 'desc';
}

const STORAGE_KEYS = {
  worklist: 'radsuite_filter_worklist_v1',
  myCases: 'radsuite_filter_my_cases_v1',
  pacs: 'radsuite_filter_pacs_v1',
  pacsQuery: 'radsuite_filter_pacs_query_v1',
  patientRecords: 'radsuite_filter_patient_records_v1',
} as const;

function safeGetItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return null;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or private mode fallback
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

// --- Worklist Filters ---
export function loadSavedWorklistFilters(): WorklistSavedFilters | null {
  return safeGetItem<WorklistSavedFilters>(STORAGE_KEYS.worklist);
}

export function saveWorklistFilters(filters: WorklistSavedFilters): void {
  // Sanitize: ensure no search or PHI is stored
  const sanitized: WorklistSavedFilters = {
    tabFilter: filters.tabFilter,
    departmentFilter: filters.departmentFilter,
    statusFilter: filters.statusFilter,
    modalityFilter: filters.modalityFilter,
    priorityFilter: filters.priorityFilter,
    sourceFilter: filters.sourceFilter,
    showFilmCharges: filters.showFilmCharges,
    pageSize: filters.pageSize,
    sortField: filters.sortField,
    sortDirection: filters.sortDirection,
    advancedFilters: filters.advancedFilters ? {
      dateRange: filters.advancedFilters.dateRange,
      dateFrom: filters.advancedFilters.dateFrom,
      dateTo: filters.advancedFilters.dateTo,
      bodyPart: filters.advancedFilters.bodyPart,
      gender: filters.advancedFilters.gender,
      source: filters.advancedFilters.source,
      sortBy: filters.advancedFilters.sortBy,
      criticalOnly: filters.advancedFilters.criticalOnly,
      imagesReadyOnly: filters.advancedFilters.imagesReadyOnly,
    } : undefined,
  };
  safeSetItem(STORAGE_KEYS.worklist, sanitized);
}

export function clearSavedWorklistFilters(): void {
  safeRemoveItem(STORAGE_KEYS.worklist);
}

// --- My Cases Filters ---
export function loadSavedMyCasesFilters(): MyCasesSavedFilters | null {
  return safeGetItem<MyCasesSavedFilters>(STORAGE_KEYS.myCases);
}

export function saveMyCasesFilters(filters: MyCasesSavedFilters): void {
  const sanitized: MyCasesSavedFilters = {
    modality: filters.modality,
    status: filters.status,
    priority: filters.priority,
    department: filters.department,
    bodyPart: filters.bodyPart,
    dateRange: filters.dateRange,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
    imagesReadyOnly: filters.imagesReadyOnly,
    showFilmCharges: filters.showFilmCharges,
    pageSize: filters.pageSize,
    sortField: filters.sortField,
    sortDirection: filters.sortDirection,
  };
  safeSetItem(STORAGE_KEYS.myCases, sanitized);
}

export function clearSavedMyCasesFilters(): void {
  safeRemoveItem(STORAGE_KEYS.myCases);
}

// --- PACS Workstation Filters ---
export function loadSavedPacsFilters(): PacsSavedFilters | null {
  return safeGetItem<PacsSavedFilters>(STORAGE_KEYS.pacs);
}

export function savePacsFilters(filters: PacsSavedFilters): void {
  const sanitized: PacsSavedFilters = {
    modality: filters.modality,
    region: filters.region,
    datePreset: filters.datePreset,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
    location: filters.location,
    searchField: filters.searchField,
    pageSize: filters.pageSize,
  };
  safeSetItem(STORAGE_KEYS.pacs, sanitized);
}

export function clearSavedPacsFilters(): void {
  safeRemoveItem(STORAGE_KEYS.pacs);
}

// --- PACS Query Client Filters ---
export function loadSavedPacsQueryFilters(): PacsQuerySavedFilters | null {
  return safeGetItem<PacsQuerySavedFilters>(STORAGE_KEYS.pacsQuery);
}

export function savePacsQueryFilters(filters: PacsQuerySavedFilters): void {
  const sanitized: PacsQuerySavedFilters = {
    modality: filters.modality,
    dateRange: filters.dateRange,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    source: filters.source,
  };
  safeSetItem(STORAGE_KEYS.pacsQuery, sanitized);
}

export function clearSavedPacsQueryFilters(): void {
  safeRemoveItem(STORAGE_KEYS.pacsQuery);
}

// --- Patient Records Filters ---
export function loadSavedPatientRecordsFilters(): PatientRecordsSavedFilters | null {
  return safeGetItem<PatientRecordsSavedFilters>(STORAGE_KEYS.patientRecords);
}

export function savePatientRecordsFilters(filters: PatientRecordsSavedFilters): void {
  const sanitized: PatientRecordsSavedFilters = {
    modalityFilter: filters.modalityFilter,
    statusFilter: filters.statusFilter,
    datePreset: filters.datePreset,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
    sortField: filters.sortField,
    sortDir: filters.sortDir,
  };
  safeSetItem(STORAGE_KEYS.patientRecords, sanitized);
}

export function clearSavedPatientRecordsFilters(): void {
  safeRemoveItem(STORAGE_KEYS.patientRecords);
}
