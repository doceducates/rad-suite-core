/**
 * HMIS Punjab Radiology Domain Models, CT & MRI Procedure Modules
 * Verified live against HMIS deployment (22 CT Modules, 38 MRI Modules).
 */

import {
  HmisModuleOption,
  HMIS_CT_MODULE_OPTIONS,
  HMIS_MRI_MODULE_OPTIONS,
} from './hmis-modules.data';

export {
  type HmisModuleOption,
  HMIS_CT_MODULE_OPTIONS,
  HMIS_MRI_MODULE_OPTIONS,
};

export interface HmisInvestigationDetails {
  patientName: string;
  mrn: string;
  age?: string;
  gender?: string;
  cnic?: string;
  contact?: string;
  visitToken?: string;
  investigationId: string;
  studyId?: string;
  moduleId?: string;
  moduleName?: string;
  existingHistory?: string;
  existingReport?: string;
  existingImpression?: string;
  comments?: string;
  isModalOpen: boolean;
}

export interface HmisPriorReport {
  id?: string;
  date?: string;
  department: 'Pathology' | 'Radiology' | 'Other';
  testName: string;
  resultSummary?: string;
  reportedBy?: string;
  status?: string;
}

export interface HmisMilestoneDetail {
  timestamp: string | null;
  actor: string | null;
}

export interface HmisAuthCredentials {
  username?: string;
  hospitalId?: string;
  password?: string;
  reportingDoctorName?: string;
}

export interface HmisBatchResponse {
  success: boolean;
  jobId?: string;
  total?: number;
  processed?: number;
  successful?: number;
  failed?: number;
  status?: string;
  items?: any[];
  message?: string;
  error?: string;
}

export interface HmisMilestonesBreakdown {
  order: HmisMilestoneDetail | null;
  receptions: HmisMilestoneDetail | null;
  scheduled: HmisMilestoneDetail | null;
  pendingAcknowledgment: HmisMilestoneDetail | null;
  radiographerAcknowledgment: HmisMilestoneDetail | null;
  performed: HmisMilestoneDetail | null;
  rejected: HmisMilestoneDetail | null;
  verified: HmisMilestoneDetail | null;
  published: HmisMilestoneDetail | null;
}

export interface HmisTrackingRecord {
  id: string;
  section: string;
  mrn: string;
  patientName: string;
  cnic?: string;
  contact?: string;
  accession: string;
  department?: string;
  room?: string;
  cpt?: string;
  priority?: string;
  status: string;
  clinicalStageLabel?: string;
  isAcknowledged?: boolean;
  isPendingAcknowledgment?: boolean;
  isPerformed?: boolean;
  isPublished?: boolean;
  acknowledgmentActor?: string | null;
  acknowledgmentTimestamp?: string | null;
  radiographer?: string | null;
  orderingDoctor?: string | null;
  currentStageIndex: number;
  milestones: HmisMilestonesBreakdown;
  rawText?: string;
}

export interface HmisTrackingListFilters {
  mrn?: string;
  name?: string;
  contact?: string;
  cnic?: string;
  accession?: string;
  cpt?: string;
  modality?: string;
  roleSubCategory?: string;
  subCategory?: string;
  serviceType?: string;
  department?: string;
  searchDepartment?: string;
  room?: string;
  searchRoom?: string;
  shift?: string;
  departmentShift?: string;
  timeList?: string;
  startDate?: string;
  endDate?: string;
  perPage?: number;
  page?: number;
  fetchAllPages?: boolean;
  maxPages?: number;
  bypassCache?: boolean;
}

export interface HmisTrackingListEnvelope {
  source: string;
  totalRecords: number;
  page: number;
  perPage: number;
  count: number;
  hasNextPage: boolean;
  pagesHarvested?: number;
  filtersApplied?: Record<string, any>;
  records: HmisTrackingRecord[];
}

export interface HmisPublishedReport {
  mrn: string;
  patientName: string;
  cnic?: string;
  gender?: string;
  accession: string;
  publishedDate: string;
  addedBy: string;
  doctor?: string;
  department?: string;
  clinic?: string;
  room?: string;
  testType?: string;
  billingStatus?: string;
  studyTitle?: string;
  pdfUrl?: string | null;
  pdfEncodedId?: string | null;
  status: 'PUBLISHED';
}

export interface HmisWorklistFilters {
  modality?: string;
  subCategory?: string;
  serviceType?: string;
  department?: string;
  status?: string;
  gender?: string;
  room?: string;
  dateType?: string;
  timeList?: string;
  startDate?: string;
  endDate?: string;
  mrn?: string;
  name?: string;
  contact?: string;
  cnic?: string;
  accession?: string;
  cpt?: string;
  perPage?: number;
  page?: number;
  fetchAllPages?: boolean;
  maxPages?: number;
  bypassCache?: boolean;
}

export interface HmisWorklistEnvelope {
  totalRecords: number;
  page: number;
  perPage: number;
  count: number;
  hasNextPage: boolean;
  filtersApplied?: Record<string, any>;
  records: any[];
}

export interface HmisSubmitResultPayload {
  investigationId?: string;
  patientMrn: string;
  patientName?: string;
  accessionNumber?: string;
  moduleId: string;
  modality?: string;
  scanType?: string;
  technique?: string;
  findings: string;
  impression: string;
  clinicalHistory?: string;
  comments?: string;
  pgrName?: string;
  consultantName?: string;
  action: 'save' | 'submit' | 'stage_only';
}

/**
 * Matches a study scan type or text to HMIS Procedure Modules (CT or MRI).
 */
export function matchHmisModule(query?: string | null, preferredModality?: string | null): HmisModuleOption | undefined {
  if (!query) return undefined;
  const q = query.toUpperCase().trim().replace(/&/g, 'AND');
  const isMri = preferredModality === 'MRI' || q.includes('MRI') || q.includes('MRCP') || q.includes('MRA');

  if (isMri) {
    // 1. Exact match in MRI
    const exactMri = HMIS_MRI_MODULE_OPTIONS.find((m) => m.text.toUpperCase() === q);
    if (exactMri) return exactMri;

    // 2. High-specificity MRI checks
    if (q.includes('LUMB') || q.includes('LS SPINE') || q.includes('L-SPINE')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '792');
    if (q.includes('CERVICAL') || q.includes('C-SPINE')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '791');
    if (q.includes('DORSAL') || q.includes('THORACIC')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '793') || HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '929');
    if (q.includes('WHOLE SPINE')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '904');
    if (q.includes('BRAIN') && q.includes('ORBIT')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '790');
    if (q.includes('BRAIN')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '789');
    if (q.includes('KNEE')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '785');
    if (q.includes('SHOULDER')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '783');
    if (q.includes('HIP')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '786');
    if (q.includes('MRCP')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '782');
    if (q.includes('PELVI')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '795');
    if (q.includes('SI JOINT') || q.includes('SACROILIAC')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '796');
    if (q.includes('PNS')) return HMIS_MRI_MODULE_OPTIONS.find((m) => m.value === '916');

    // Substring fallback
    const sortedMri = [...HMIS_MRI_MODULE_OPTIONS].sort((a, b) => b.text.length - a.text.length);
    const substrMri = sortedMri.find((m) => q.includes(m.text.toUpperCase()));
    if (substrMri) return substrMri;
  }

  // CT Module Matching
  const exactCt = HMIS_CT_MODULE_OPTIONS.find((m) => m.text === q);
  if (exactCt) return exactCt;

  if (q.includes('HRCT')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '813');
  if (q.includes('CTPA')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '812');
  if (q.includes('ABDOMEN') && q.includes('PELVI')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '805');
  if (q.includes('BRAIN') || q.includes('HEAD')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '803');
  if (q.includes('CHEST') || q.includes('THORAX')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '806');
  if (q.includes('KUB')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '807');
  if (q.includes('ABDOMEN')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '814');
  if (q.includes('PNS') || q.includes('SINUS')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '811');
  if (q.includes('LUMBAR') || q.includes('LS SPINE')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '819');
  if (q.includes('CERVICAL') || q.includes('C-SPINE')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '818');
  if (q.includes('ORBIT')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '804');
  if (q.includes('TEMPORAL') || q.includes('MASTOID')) return HMIS_CT_MODULE_OPTIONS.find((m) => m.value === '820');

  const sortedCt = [...HMIS_CT_MODULE_OPTIONS].sort((a, b) => b.text.length - a.text.length);
  return sortedCt.find((m) => q.includes(m.text));
}
