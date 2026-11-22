import { z } from 'zod';

export const CaseSyncPatientSchema = z.object({
  id: z.string().nullish(),
  mrNumber: z.string().min(1, 'Patient MRN is required'),
  fullName: z.string().min(1, 'Patient name is required'),
  dob: z.string().nullish(),
  age: z.coerce.number().int().min(0).max(130).default(0),
  gender: z.string().default('Male'),
  phone: z.string().nullish(),
  cnic: z.string().nullish(),
  guardianName: z.string().nullish(),
  address: z.string().nullish(),
  bloodGroup: z.string().nullish(),
  allergies: z.string().nullish(),
  clinicalNotes: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const CaseSyncStudySchema = z.object({
  id: z.string().nullish(),
  accessionNumber: z.string().min(1, 'Accession number is required'),
  patientMrn: z.string().min(1),
  modality: z.string().default('CT'),
  scanType: z.string().default('Scan'),
  bodyPart: z.string().default('Body'),
  priority: z.string().default('routine'),
  status: z.string().default('scheduled'),
  scheduledAt: z.string().default(() => new Date().toISOString()),
  referringDoctor: z.string().nullish(),
  technologist: z.string().nullish(),
  contrastUsed: z.boolean().nullish().default(false),
  contrastAgent: z.string().nullish(),
  contrastVolumeMl: z.number().nullish().default(0),
  machineId: z.string().nullish(),
  assignedRadiologistId: z.string().nullish(),
  claimedAt: z.string().nullish(),
  department: z.string().nullish(),
  room: z.string().nullish(),
  clinicalHistory: z.string().nullish(),
  hmisInvestigationId: z.string().nullish(),
  hmisCpt: z.string().nullish(),
  hmisMilestonesJson: z.string().nullish(),
  hmisStatus: z.string().nullish(),
  isManual: z.boolean().nullish().default(false),
  createdAt: z.string().nullish(),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const CaseSyncRevisionSchema = z.object({
  version: z.number().int().min(1),
  authorId: z.string().nullish(),
  authorName: z.string().nullish(),
  authorRole: z.string().nullish(),
  status: z.string(),
  findings: z.string().nullish(),
  impression: z.string().nullish(),
  technique: z.string().nullish(),
  recommendation: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export const CaseSyncReportSchema = z.object({
  id: z.string().nullish(),
  accessionNumber: z.string().min(1),
  authorId: z.string().nullish(),
  status: z.string().default('draft'),
  clinicalHistory: z.string().nullish(),
  technique: z.string().nullish(),
  comparison: z.string().nullish(),
  findings: z.string().nullish(),
  impression: z.string().nullish(),
  recommendation: z.string().nullish(),
  criticalFinding: z.boolean().nullish().default(false),
  signedBy: z.string().nullish(),
  signedAt: z.string().nullish(),
  pendingReason: z.string().nullish(),
  pendingNotes: z.string().nullish(),
  pendingAt: z.string().nullish(),
  pendingBy: z.string().nullish(),
  contentJson: z.any().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().default(() => new Date().toISOString()),
  revisions: z.array(CaseSyncRevisionSchema).nullish(),
});

export const CaseSyncSeriesSchema = z.object({
  seriesInstanceUid: z.string(),
  seriesNumber: z.number().nullish(),
  modality: z.string().default('MR'),
  seriesDescription: z.string().default(''),
  numInstances: z.number().default(1),
  bodyPart: z.string().nullish(),
});

export const CaseSyncBundleSchema = z.object({
  accessionNumber: z.string().min(1, 'Accession number is required'),
  action: z.enum(['upsert', 'delete']).default('upsert'),
  patient: CaseSyncPatientSchema,
  study: CaseSyncStudySchema,
  report: CaseSyncReportSchema.nullish(),
  series: z.array(CaseSyncSeriesSchema).nullish(),
  reportingUserId: z.string().nullish(),
  hospitalId: z.string().nullish(),
  tombstoned: z.boolean().nullish(),
  tombstoneReason: z.string().nullish(),
  tombstoneDeletedAt: z.string().nullish(),
  clientTimestamp: z.string().default(() => new Date().toISOString()),
});

export const CaseSyncPushSchema = z.object({
  clientId: z.string().optional(),
  bundles: z.array(CaseSyncBundleSchema).optional().default([]),
  pacsStudies: z.array(z.any()).optional().default([]),
}).refine((data) => data.bundles.length > 0 || data.pacsStudies.length > 0, {
  message: 'At least one case bundle or PACS study required',
});

export const CaseSyncPullQuerySchema = z.object({
  since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  scope: z.enum(['my_cases', 'active_shift', 'all']).optional().default('active_shift'),
});

export const CaseSyncStatusActionSchema = z.object({
  action: z.enum(['sync-now', 'test-connection', 'backfill-outbox']),
});
