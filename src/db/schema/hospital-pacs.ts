import { pgTable, text, integer, boolean, timestamp, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';

// PostgreSQL Schema definition (canonical schema exported in src/db/schema/index.ts)
export const hospitalPacsStudies = pgTable('hospital_pacs_studies', {
  id: uuid('id').primaryKey().defaultRandom(),
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
  s3Status: text('s3_status').default('not_uploaded'), // not_uploaded | queued | retrieving | uploading | synced | failed
  s3KeyPrefix: text('s3_key_prefix'),
  s3UploadedAt: timestamp('s3_uploaded_at', { withTimezone: true }),
  storageTargetUserId: text('storage_target_user_id'),
  gdriveFileId: text('gdrive_file_id'),
  gdriveSyncedAt: text('gdrive_synced_at'),
  isEphemeralVps: boolean('is_ephemeral_vps').default(false),
  lastIndexedAt: timestamp('last_indexed_at', { withTimezone: true }).notNull().defaultNow(),
  rawTagsJson: text('raw_tags_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_pacs_studies_acc').on(t.accessionNumber),
  index('idx_pacs_studies_modality').on(t.modality),
  index('idx_pacs_studies_date').on(t.studyDate),
  index('idx_pacs_studies_s3_status').on(t.s3Status),
  uniqueIndex('idx_pacs_studies_acc_modality').on(t.accessionNumber, t.modality),
]);

export type HospitalPacsStudy = typeof hospitalPacsStudies.$inferSelect;
export type NewHospitalPacsStudy = typeof hospitalPacsStudies.$inferInsert;
