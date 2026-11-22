import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, index } from 'drizzle-orm/pg-core';
import { studies } from './studies';
import { patients } from './patients';
import { users } from './users';

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  studyId: uuid('study_id').notNull().references(() => studies.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('draft'), // draft | preliminary | submitted | final | amended
  clinicalHistory: text('clinical_history').default(''),
  technique: text('technique').default(''),
  comparison: text('comparison').default(''),
  findings: text('findings').default(''),
  impression: text('impression').default(''),
  recommendation: text('recommendation').default(''),
  contentJson: jsonb('content_json'),
  criticalFinding: boolean('critical_finding').notNull().default(false),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  signedBy: text('signed_by').default(''),
  // Case Pending reason tracking
  pendingReason: text('pending_reason'),
  pendingNotes: text('pending_notes'),
  pendingAt: timestamp('pending_at', { withTimezone: true }),
  pendingBy: text('pending_by'),
  // PGR draft snapshot tracking
  pgrDraftFindings: text('pgr_draft_findings'),
  pgrDraftImpression: text('pgr_draft_impression'),
  pgrAuthorId: uuid('pgr_author_id').references(() => users.id, { onDelete: 'set null' }),
  pgrSubmittedAt: timestamp('pgr_submitted_at', { withTimezone: true }),
  // Google Docs & Drive synchronization tracking
  googleDocId: text('google_doc_id'),
  googleDocUrl: text('google_doc_url'),
  googleSyncedAt: timestamp('google_synced_at', { withTimezone: true }),
  googleSyncStatus: text('google_sync_status').notNull().default('none'),
  diagnosisHighlight: text('diagnosis_highlight'),
  discussionJson: jsonb('discussion_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('reports_study_idx').on(t.studyId),
  index('reports_status_idx').on(t.status),
  index('reports_pending_idx').on(t.pendingReason),
  index('reports_google_doc_idx').on(t.googleDocId),
]);

export const reportRevisions = pgTable('report_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  authorId: text('author_id'),
  authorName: text('author_name'),
  authorRole: text('author_role'),
  status: text('status').notNull(),
  findings: text('findings').default(''),
  impression: text('impression').default(''),
  technique: text('technique').default(''),
  recommendation: text('recommendation').default(''),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('revisions_report_idx').on(t.reportId),
]);

