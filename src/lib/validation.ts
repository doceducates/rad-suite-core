import { z } from 'zod';
export * from './auth-validation';

export const ReportPendingSchema = z.object({
  reportId: z.string().optional(),
  studyId: z.string().optional(),
  accessionNumber: z.string().optional(),
  pendingReason: z
    .enum([
      'awaiting_prior_images',
      'awaiting_lab_creatinine',
      'missing_history_form',
      'technologist_ack_pending',
      'pacs_transfer_pending',
      'motion_artifact_repeat',
      'awaiting_clinical_history',
      'second_opinion_subspecialty',
      'study_case',
      'other',
    ])
    .nullable()
    .optional(),
  pendingNotes: z.string().nullable().optional(),
});

export const GenderEnum = z.enum(['Male', 'Female', 'Other']);

export const OptionalGenderSchema = z.preprocess((val) => {
  if (!val || typeof val !== 'string') return undefined;
  const s = val.trim().toUpperCase();
  if (s === 'M' || s === 'MALE') return 'Male';
  if (s === 'F' || s === 'FEMALE') return 'Female';
  if (s === 'O' || s === 'OTHER') return 'Other';
  return undefined;
}, GenderEnum.optional());

export const OptionalAgeSchema = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : Math.round(num);
}, z.number().int().min(0).max(130).optional());

export const ReportStatusEnum = z.enum([
  'scheduled',
  'draft',
  'preliminary',
  'pending',
  'submitted',
  'final',
  'amended',
]);

export const OptionalReportStatusSchema = z.preprocess((val) => {
  if (!val || typeof val !== 'string') return undefined;
  const s = val.toLowerCase();
  if (['scheduled', 'draft', 'preliminary', 'pending', 'submitted', 'final', 'amended'].includes(s)) return s;
  if (s === 'finalized' || s === 'reported') return 'final';
  if (s === 'awaiting_report') return 'scheduled';
  return val;
}, ReportStatusEnum.optional());

export const OptionalBooleanSchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (val === true || val === 1 || val === 'true' || val === '1') return true;
  if (val === false || val === 0 || val === 'false' || val === '0') return false;
  return Boolean(val);
}, z.boolean().optional());

export const ReportUpdateSchema = z.object({
  reportId: z.string().optional(),
  studyId: z.string().optional(),
  accessionNumber: z.string().optional(),
  patientId: z.string().optional(),
  patientMrn: z.string().optional(),
  patientName: z.string().optional(),
  age: OptionalAgeSchema,
  gender: OptionalGenderSchema,
  modality: z.string().optional(),
  studyDescription: z.string().optional(),
  clinicalHistory: z.string().optional(),
  technique: z.string().optional(),
  comparison: z.string().optional(),
  findings: z.string().optional(),
  impression: z.string().optional(),
  recommendation: z.string().optional(),
  contentJson: z.any().optional(),
  status: OptionalReportStatusSchema,
  criticalFinding: OptionalBooleanSchema,
  pendingReason: z.string().optional(),
  pendingNotes: z.string().optional(),
  pgrDraftFindings: z.string().optional(),
  pgrDraftImpression: z.string().optional(),
  isAutoSave: OptionalBooleanSchema,
  milestoneTag: z.string().optional(),
});

export const StudyCreateSchema = z.object({
  patientId: z.string().uuid('Valid patient ID required'),
  modality: z.string().min(1, 'Modality required'),
  scanType: z.string().min(1, 'Scan type required'),
  bodyPart: z.string().min(1, 'Body part required'),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  referringDoctor: z.string().optional(),
  clinicalHistory: z.string().optional(),
  contrastUsed: z.boolean().default(false),
  contrastAgent: z.string().optional(),
  contrastVolumeMl: z.number().int().nonnegative().optional(),
  machineId: z.string().optional(),
  technologist: z.string().optional(),
});

export const PatientCreateSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  age: z.preprocess((val) => Number(val) || 0, z.number().int().min(0).max(130)),
  gender: z.preprocess((val) => {
    if (!val || typeof val !== 'string') return 'Male';
    const s = val.trim().toUpperCase();
    if (s === 'F' || s === 'FEMALE') return 'Female';
    if (s === 'O' || s === 'OTHER') return 'Other';
    return 'Male';
  }, GenderEnum),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  guardianName: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  clinicalNotes: z.string().optional(),
});

export const PacsServerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Server name is required'),
  aeTitle: z.string().min(1, 'AE Title is required').max(16, 'AE Title maximum 16 chars'),
  host: z.string().min(1, 'Host IP or hostname is required'),
  port: z.number().int().min(1).max(65535),
  callingAeTitle: z.string().min(1).max(16).default('RADIANT'),
  listenerPort: z.number().int().min(1).max(65535).default(11112),
  retrieveProtocol: z.enum(['C-GET', 'C-MOVE']).default('C-GET'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
});

const safeBooleanParam = OptionalBooleanSchema;

export const PacsQuerySchema = z.object({
  accessionNumber: z.string().optional(),
  patientMrn: z.string().optional(),
  patientName: z.string().optional(),
  modality: z.string().optional(),
  dateRange: z.enum(['today', 'yesterday', 'shift', 'recent', 'week', 'month', 'all', 'custom', '48h', '7d', '30d']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  serverId: z.string().optional(),
  source: z.enum(['all', 'local', 'local_archive', 'pacs', 'hospital_pacs', 'gdrive', 's3', 'worklist', 'hmis', 'remote_node']).optional(),
  query: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  bodyPart: z.string().optional(),
  gender: z.string().optional(),
  criticalOnly: safeBooleanParam,
  assignedTo: z.string().optional(),
  currentUserId: z.string().optional(),
  discrepancyOnly: safeBooleanParam,
  department: z.string().optional(),
  hmisOnly: safeBooleanParam,
  hideFilmCharges: safeBooleanParam,
  imagesReadyOnly: safeBooleanParam,
  groupBy: z.enum(['patient', 'study']).optional(),
  sortBy: z.enum([
    'date_desc',
    'date_asc',
    'accession_asc',
    'accession_desc',
    'patient_name_asc',
    'patient_name_desc',
    'patient_name',
    'modality_asc',
    'modality_desc',
    'status_asc',
    'status_desc',
    'source_asc',
    'source_desc',
    'priority',
    'priority_asc',
    'priority_desc',
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const UnifiedStorageSettingsSchema = z.object({
  localPath: z.string().min(1, 'Local path is required'),
  pacsEnabled: z.boolean().default(true),
  gdriveEnabled: z.boolean().default(false),
  gdriveFolderId: z.string().optional(),
  gdriveServiceAccountEmail: z.string().optional(),
  gdriveServiceAccountKey: z.string().optional(),
  s3Enabled: z.boolean().default(false),
  s3Endpoint: z.string().optional(),
  s3Region: z.string().optional(),
  s3Bucket: z.string().optional(),
  s3AccessKeyId: z.string().optional(),
  s3SecretAccessKey: z.string().optional(),
  s3ForcePathStyle: z.boolean().default(false),
});

export const PacsImportSchema = z.object({
  accessionNumber: z.string().min(1, 'Accession number required'),
  patientName: z.string().min(1, 'Patient name required'),
  patientMrn: z.string().min(1, 'Patient MRN required'),
  age: z.preprocess((val) => Number(val) || 35, z.number().int().min(0).max(130)).default(35),
  gender: z.preprocess((val) => {
    if (!val || typeof val !== 'string') return 'Male';
    const s = val.trim().toUpperCase();
    if (s === 'F' || s === 'FEMALE') return 'Female';
    if (s === 'O' || s === 'OTHER') return 'Other';
    return 'Male';
  }, GenderEnum).default('Male'),
  modality: z.string().min(1).default('CT'),
  studyDescription: z.string().default('Radiology Examination'),
  studyDate: z.string().optional(),
  numSeries: z.number().int().default(1),
  numInstances: z.number().int().default(1),
  studyInstanceUid: z.string().optional(),
});

export const HmisDispatchSchema = z.object({
  patientMrn: z.string().min(1, 'Patient MRN required'),
  patientName: z.string().min(1, 'Patient name required'),
  accessionNumber: z.string().optional(),
  modality: z.string().default('CT'),
  scanType: z.string().default('Cross-Sectional Imaging'),
  technique: z.string().optional(),
  findings: z.string().min(1, 'Findings are required for report dispatch'),
  impression: z.string().min(1, 'Impression is required for report dispatch'),
  clinicalHistory: z.string().optional(),
  pgrName: z.string().optional(),
  consultantName: z.string().optional(),
  provisionalDiagnosis: z.string().optional(),
  icd10Code: z.string().optional(),
  hospitalId: z.string().optional(),
});

export const HmisSubmitResultSchema = z.object({
  investigationId: z.string().optional(),
  patientMrn: z.string().min(1, 'Patient MRN required'),
  patientName: z.string().optional(),
  accessionNumber: z.string().optional(),
  moduleId: z.string().min(1, 'Module ID required'),
  modality: z.string().default('CT'),
  scanType: z.string().optional(),
  technique: z.string().optional(),
  findings: z.string().min(1, 'Findings are required'),
  impression: z.string().min(1, 'Impression is required'),
  clinicalHistory: z.string().optional(),
  comments: z.string().optional(),
  pgrName: z.string().optional(),
  consultantName: z.string().optional(),
  action: z.enum(['save', 'submit', 'stage_only']).default('save'),
});

export const HmisSearchQuerySchema = z
  .object({
    mrn: z.string().optional(),
    accession: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine((data) => !!(data.mrn || data.accession), {
    message: 'Either MRN or Accession number is required for patient lookup',
  });

export const HmisPublishedQuerySchema = z
  .object({
    accession: z.string().optional(),
    mrn: z.string().optional(),
    contact: z.string().optional(),
    cnic: z.string().optional(),
  })
  .refine((data) => !!(data.accession || data.mrn || data.contact || data.cnic), {
    message: 'At least one search filter (Accession, MRN, Contact, or CNIC) is required',
  });

export const HmisWorklistQuerySchema = z.object({
  modality: z.string().optional(),
  subCategory: z.string().optional(),
  serviceType: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  gender: z.string().optional(),
  room: z.string().optional(),
  dateType: z.string().optional(),
  timeList: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  mrn: z.string().optional(),
  name: z.string().optional(),
  contact: z.string().optional(),
  cnic: z.string().optional(),
  accession: z.string().optional(),
  cpt: z.string().optional(),
  perPage: z.coerce.number().int().min(10).max(100).optional().default(50),
  page: z.coerce.number().int().min(1).optional().default(1),
  fetchAllPages: z.coerce.boolean().optional().default(false),
  maxPages: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export const HmisTrackingListQuerySchema = z.object({
  mrn: z.string().optional(),
  name: z.string().optional(),
  contact: z.string().optional(),
  cnic: z.string().optional(),
  accession: z.string().optional(),
  cpt: z.string().optional(),
  modality: z.string().optional(),
  roleSubCategory: z.string().optional(),
  subCategory: z.string().optional(),
  department: z.string().optional(),
  serviceType: z.string().optional(),
  searchDepartment: z.string().optional(),
  room: z.string().optional(),
  searchRoom: z.string().optional(),
  shift: z.string().optional(),
  departmentShift: z.string().optional(),
  timeList: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  perPage: z.coerce.number().int().min(10).max(100).optional().default(100),
  page: z.coerce.number().int().min(1).optional().default(1),
  fetchAllPages: z.coerce.boolean().optional().default(false),
  maxPages: z.coerce.number().int().min(1).max(20).optional().default(5),
  bypassCache: z.coerce.boolean().optional(),
});

export * from './report-export-validation';
export * from './sync-validation';


