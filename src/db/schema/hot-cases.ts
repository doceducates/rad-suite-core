import { pgTable, text, integer, boolean, index } from 'drizzle-orm/pg-core';

export const hotStagedStudies = pgTable(
  'hot_staged_studies',
  {
    accessionNumber: text('accession_number').primaryKey(),
    patientName: text('patient_name').notNull().default(''),
    patientId: text('patient_id').notNull().default(''),
    modality: text('modality').notNull().default('MR'),
    studyDescription: text('study_description').notNull().default(''),
    studyDate: text('study_date').notNull().default(''),
    studyTime: text('study_time').notNull().default(''),
    studyInstanceUid: text('study_instance_uid').notNull().default(''),
    sliceCount: integer('slice_count').notNull().default(0),
    totalSlices: integer('total_slices').notNull().default(0),
    sizeBytes: integer('size_bytes').notNull().default(0),
    isSyncedToS3: boolean('is_synced_to_s3').notNull().default(false),
    s3SyncedSliceCount: integer('s3_synced_slice_count').notNull().default(0),
    storageTargetUserId: text('storage_target_user_id'),
    gdriveFileId: text('gdrive_file_id'),
    gdriveSyncedAt: text('gdrive_synced_at'),
    isEphemeralVps: boolean('is_ephemeral_vps').notNull().default(false),
    lastSliceStagedAt: text('last_slice_staged_at').notNull(),
    s3CompletedAt: text('s3_completed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_hot_staged_study_date').on(t.studyDate),
    index('idx_hot_staged_is_synced').on(t.isSyncedToS3),
    index('idx_hot_staged_updated_at').on(t.updatedAt),
  ]
);

export type HotStagedStudy = typeof hotStagedStudies.$inferSelect;
export type NewHotStagedStudy = typeof hotStagedStudies.$inferInsert;
