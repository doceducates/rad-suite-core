import { pgTable, text, timestamp, boolean, integer, uuid, index } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { users } from './users';

export const studies = pgTable('studies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  accessionNumber: text('accession_number').notNull().unique(),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  modality: text('modality').notNull().default('CT'), // CT, MRI, X-Ray, Ultrasound, etc.
  scanType: text('scan_type').notNull(),
  bodyPart: text('body_part').notNull(),
  priority: text('priority').notNull().default('routine'), // routine | urgent | stat
  status: text('status').notNull().default('scheduled'), // scheduled | in_progress | completed | cancelled
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
  referringDoctor: text('referring_doctor').default(''),
  clinicalHistory: text('clinical_history').default(''),
  contrastUsed: boolean('contrast_used').notNull().default(false),
  contrastAgent: text('contrast_agent').default(''),
  contrastVolumeMl: integer('contrast_volume_ml').default(0),
  machineId: text('machine_id').default(''),
  technologist: text('technologist').default(''),
  assignedRadiologistId: uuid('assigned_radiologist_id').references(() => users.id, { onDelete: 'set null' }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  department: text('department').default(''),
  room: text('room').default(''),
  dicomSeriesInstanceUid: text('dicom_series_uid'),
  numInstances: integer('num_instances').default(1),
  hmisInvestigationId: text('hmis_investigation_id'),
  hmisCpt: text('hmis_cpt'),
  hmisMilestonesJson: text('hmis_milestones_json'),
  hmisStatus: text('hmis_status').default('unknown'),
  hmisLastCheckedAt: timestamp('hmis_last_checked_at', { withTimezone: true }),
  isManual: boolean('is_manual').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('studies_accession_idx').on(t.accessionNumber),
  index('studies_status_idx').on(t.status),
]);

export const tombstonedAccessions = pgTable('tombstoned_accessions', {
  accession: text('accession').primaryKey(),
  reason: text('reason').default('user_deleted'),
  deletedAt: text('deleted_at').notNull(),
});
