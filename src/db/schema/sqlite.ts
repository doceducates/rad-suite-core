import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  subdomain: text('subdomain'),
  status: text('status').notNull().default('active'),
  settingsJson: text('settings_json'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('radiologist'),
  status: text('status').notNull().default('pending_invite'),
  phone: text('phone'),
  hospital: text('hospital'),
  allowedScreens: text('allowed_screens'),
  allowedStorageSources: text('allowed_storage_sources'),
  inviteCodeUsed: text('invite_code_used'),
  invitedBy: text('invited_by'),
  activatedAt: text('activated_at'),
  title: text('title').default('Consultant Radiologist'),
  licenseNo: text('license_no').default(''),
  department: text('department').default('Radiology'),
  avatarColor: text('avatar_color').notNull().default('#4a7c59'),
  hmisHospitalId: text('hmis_hospital_id'),
  hmisUsername: text('hmis_username'),
  hmisPassword: text('hmis_password'),
  hmisReportingDoctorName: text('hmis_reporting_doctor_name'),
  supervisingConsultantName: text('supervising_consultant_name'),
  googleEmail: text('google_email'),
  googleRefreshToken: text('google_refresh_token'),
  googleAccessToken: text('google_access_token'),
  googleTokenExpiresAt: text('google_token_expires_at'),
  googleRootFolderId: text('google_root_folder_id'),
  googleDriveFolderIdCases: text('google_drive_folder_id_cases'),
  googleAutoSync: integer('google_auto_sync', { mode: 'boolean' }).default(false),
  storageProvider: text('storage_provider').notNull().default('auto'),
  createdAt: text('created_at').notNull(),
});

export const inviteCodes = sqliteTable('invite_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  role: text('role').notNull().default('radiologist'),
  allowedScreens: text('allowed_screens').notNull().default('["my_cases","worklist","workstation"]'),
  maxUses: integer('max_uses').notNull().default(1),
  usesCount: integer('uses_count').notNull().default(0),
  expiresAt: text('expires_at'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  recipientName: text('recipient_name'),
  recipientEmail: text('recipient_email'),
  recipientPhone: text('recipient_phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const preRegistrations = sqliteTable('pre_registrations', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  hospital: text('hospital').notNull(),
  roleDesignation: text('role_designation').notNull(),
  modalitiesOfInterest: text('modalities_of_interest'),
  status: text('status').notNull().default('waitlisted'),
  inviteCodeSent: text('invite_code_sent'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  mrNumber: text('mr_number').notNull().unique(),
  fullName: text('full_name').notNull(),
  dob: text('dob').notNull(),
  age: integer('age').notNull(),
  gender: text('gender').notNull(),
  phone: text('phone'),
  cnic: text('cnic'),
  guardianName: text('guardian_name'),
  email: text('email'),
  address: text('address'),
  emergencyContact: text('emergency_contact'),
  bloodGroup: text('blood_group'),
  allergies: text('allergies'),
  clinicalNotes: text('clinical_notes'),
  hmisAge: integer('hmis_age'),
  dicomAge: integer('dicom_age'),
  ageSource: text('age_source').default('dicom'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

export const studies = sqliteTable('studies', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  patientId: text('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  accessionNumber: text('accession_number').notNull().unique(),
  modality: text('modality').notNull(),
  scanType: text('scan_type').notNull(),
  bodyPart: text('body_part').notNull(),
  clinicalHistory: text('clinical_history'),
  priority: text('priority').notNull().default('routine'),
  status: text('status').notNull().default('pending'),
  referringPhysician: text('referring_physician'),
  scheduledAt: text('scheduled_at').notNull(),
  completedAt: text('completed_at'),
  dicomSeriesInstanceUid: text('dicom_series_uid'),
  numInstances: integer('num_instances').default(1),
  department: text('department'),
  room: text('room'),
  hmisInvestigationId: text('hmis_investigation_id'),
  hmisCpt: text('hmis_cpt'),
  hmisMilestonesJson: text('hmis_milestones_json'),
  assignedRadiologistId: text('assigned_radiologist_id'),
  claimedAt: text('claimed_at'),
  hmisStatus: text('hmis_status').default('unknown'),
  hmisLastCheckedAt: text('hmis_last_checked_at'),
  isManual: integer('is_manual', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  studyId: text('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('draft'),
  clinicalHistory: text('clinical_history'),
  technique: text('technique'),
  comparison: text('comparison'),
  findings: text('findings'),
  impression: text('impression'),
  recommendations: text('recommendations'),
  criticalFinding: integer('critical_finding', { mode: 'boolean' }).default(false),
  criticalFindingNotifiedAt: text('critical_finding_notified_at'),
  criticalFindingNotifiedTo: text('critical_finding_notified_to'),
  signedBy: text('signed_by'),
  signedAt: text('signed_at'),
  // Case Pending reason tracking
  pendingReason: text('pending_reason'),
  pendingNotes: text('pending_notes'),
  pendingAt: text('pending_at'),
  pendingBy: text('pending_by'),
  // PGR draft snapshot tracking
  pgrDraftFindings: text('pgr_draft_findings'),
  pgrDraftImpression: text('pgr_draft_impression'),
  pgrAuthorId: text('pgr_author_id'),
  pgrSubmittedAt: text('pgr_submitted_at'),
  // Google Docs & Drive synchronization tracking
  googleDocId: text('google_doc_id'),
  googleDocUrl: text('google_doc_url'),
  googleSyncedAt: text('google_synced_at'),
  googleSyncStatus: text('google_sync_status').default('none'),
  diagnosisHighlight: text('diagnosis_highlight'),
  discussionJson: text('discussion_json'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const reportRevisions = sqliteTable('report_revisions', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  authorId: text('author_id'),
  authorName: text('author_name'),
  authorRole: text('author_role'),
  status: text('status').notNull(),
  findings: text('findings'),
  impression: text('impression'),
  technique: text('technique'),
  recommendation: text('recommendation'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  prevHash: text('prev_hash'),
  hash: text('hash'),
  timestamp: text('timestamp'),
  createdAt: text('created_at').notNull(),
});

export const intakeDocuments = sqliteTable('intake_documents', {
  id: text('id').primaryKey(),
  patientName: text('patient_name').notNull(),
  mrn: text('mrn'),
  modalityRequested: text('modality_requested'),
  clinicalNotes: text('clinical_notes'),
  imageBase64: text('image_base64'),
  ocrExtractedText: text('ocr_extracted_text'),
  priority: text('priority').default('routine'),
  status: text('status').default('queued'),
  reviewedBy: text('reviewed_by'),
  createdAt: text('created_at').notNull(),
});

export const hmisSubmissions = sqliteTable('hmis_submissions', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  destinationSystem: text('destination_system').notNull(),
  status: text('status').notNull().default('queued'),
  payloadJson: text('payload_json'),
  ackResponse: text('ack_response'),
  submittedAt: text('submitted_at').notNull(),
  lastRetryAt: text('last_retry_at'),
  retryCount: integer('retry_count').default(0),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  modality: text('modality').notNull(),
  bodyPart: text('body_part').notNull(),
  clinicalHistory: text('clinical_history'),
  technique: text('technique'),
  findings: text('findings'),
  impression: text('impression'),
  createdBy: text('created_by'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const collaborativeSessions = sqliteTable('collaborative_sessions', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull(),
  activeUsersJson: text('active_users_json'),
  lastUpdate: text('last_update').notNull(),
  createdAt: text('created_at').notNull(),
});

export const pacsServers = sqliteTable('pacs_servers', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  aeTitle: text('ae_title').notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  callingAeTitle: text('calling_ae_title').notNull().default('RADIANT'),
  listenerPort: integer('listener_port').notNull().default(11112),
  retrieveProtocol: text('retrieve_protocol').notNull().default('C-GET'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  description: text('description').default(''),
  lastPingStatus: text('last_ping_status').default('unknown'),
  lastPingAt: text('last_ping_at'),
  createdAt: text('created_at').notNull(),
});

export const hmisHospitals = sqliteTable('hmis_hospitals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const tombstonedAccessions = sqliteTable('tombstoned_accessions', {
  accession: text('accession').primaryKey(),
  reason: text('reason').default('user_deleted'),
  deletedAt: text('deleted_at').notNull(),
});

export const reportSyncOutbox = sqliteTable('report_sync_outbox', {
  id: text('id').primaryKey(),
  reportId: text('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  accessionNumber: text('accession_number').notNull(),
  providerId: text('provider_id').notNull(),
  status: text('status').notNull().default('pending'),
  targetRef: text('target_ref'),
  errorMessage: text('error_message'),
  syncedAt: text('synced_at'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const hospitalPacsStudies = sqliteTable('hospital_pacs_studies', {
  id: text('id').primaryKey(),
  accessionNumber: text('accession_number').notNull(),
  patientName: text('patient_name').default(''),
  patientId: text('patient_id').default(''),
  patientMrn: text('patient_mrn').default(''),
  modality: text('modality').notNull().default('MR'),
  studyDescription: text('study_description').default(''),
  studyDate: text('study_date').default(''),
  studyTime: text('study_time').default(''),
  studyInstanceUid: text('study_instance_uid').default(''),
  numSeries: integer('num_series').default(1),
  numInstances: integer('num_instances').default(1),
  pacsSource: text('pacs_source').default('HMIS_PACS'),
  s3Status: text('s3_status').default('not_uploaded'),
  s3KeyPrefix: text('s3_key_prefix'),
  s3UploadedAt: text('s3_uploaded_at'),
  storageTargetUserId: text('storage_target_user_id'),
  gdriveFileId: text('gdrive_file_id'),
  gdriveSyncedAt: text('gdrive_synced_at'),
  isEphemeralVps: integer('is_ephemeral_vps', { mode: 'boolean' }).default(false),
  lastIndexedAt: text('last_indexed_at').notNull(),
  rawTagsJson: text('raw_tags_json'),
  createdAt: text('created_at').notNull(),
}, (t) => [
  uniqueIndex('sqlite_idx_pacs_acc_modality').on(t.accessionNumber, t.modality),
]);

export const syncChangelog = sqliteTable('sync_changelog', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(),
  dataJson: text('data_json'),
  actorId: text('actor_id').default('system'),
  changedAt: text('changed_at').notNull(),
});

export const clientWorkstations = sqliteTable('client_workstations', {
  id: text('id').primaryKey(),
  machineId: text('machine_id').notNull().unique(),
  hostname: text('hostname').default(''),
  platform: text('platform').notNull().default('windows'),
  osVersion: text('os_version').default(''),
  appVersion: text('app_version').notNull().default('1.0.0'),
  lastUserId: text('last_user_id'),
  lastUserName: text('last_user_name').default(''),
  ipAddress: text('ip_address').default(''),
  status: text('status').notNull().default('online'),
  metadata: text('metadata').default('{}'),
  installedAt: text('installed_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
});

export * from './sqlite-case-shares';


