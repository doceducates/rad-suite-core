import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { studies } from './studies';

export const hmisSubmissions = pgTable('hmis_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  studyId: uuid('study_id').references(() => studies.id, { onDelete: 'cascade' }),
  targetPortal: text('target_portal').notNull().default('https://hmis.punjab.gov.pk/'),
  status: text('status').notNull().default('queued'), // queued | filled | submitted | error
  payload: jsonb('payload'),
  note: text('note').default(''),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const hmisInvestigations = pgTable(
  'hmis_investigations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    investigationId: text('investigation_id').notNull().unique(), // e.g. 56484260
    patientMrn: text('patient_mrn').notNull(),
    patientName: text('patient_name').default(''),
    studyAccession: text('study_accession').default(''),
    moduleId: text('module_id').default(''), // 803..825
    moduleName: text('module_name').default(''),
    status: text('status').notNull().default('pending'), // pending | draft | submitted | rejected
    clinicalHistory: text('clinical_history').default(''),
    reportText: text('report_text').default(''),
    impressionText: text('impression_text').default(''),
    comments: text('comments').default(''),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('hmis_inv_mrn_idx').on(t.patientMrn),
    index('hmis_inv_status_idx').on(t.status),
  ]
);

export const hmisPriorReports = pgTable(
  'hmis_prior_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    investigationId: text('investigation_id').default(''),
    patientMrn: text('patient_mrn').notNull(),
    department: text('department').notNull().default('Pathology'), // Pathology | Radiology | Other
    testName: text('test_name').notNull(),
    resultSummary: text('result_summary').default(''),
    reportDate: text('report_date').default(''),
    status: text('status').default('Reported'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('hmis_prior_mrn_idx').on(t.patientMrn),
    index('hmis_prior_dept_idx').on(t.department),
  ]
);

export const hmisDraftVault = pgTable(
  'hmis_draft_vault',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accession: text('accession').notNull(),
    patientMrn: text('patient_mrn').notNull(),
    patientName: text('patient_name').default(''),
    investigationId: text('investigation_id').default(''),
    moduleId: text('module_id').notNull(),
    version: text('version').notNull().default('1'),
    clinicalHistory: text('clinical_history').default(''),
    technique: text('technique').default(''),
    findings: text('findings').default(''),
    impression: text('impression').default(''),
    comments: text('comments').default(''),
    pgrName: text('pgr_name').default(''),
    consultantName: text('consultant_name').default(''),
    status: text('status').notNull().default('pending'), // pending | verified | unverified | failed | reverted
    verificationAudit: text('verification_audit').default(''),
    auditScreenshot: text('audit_screenshot').default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (t) => [
    index('hmis_vault_acc_idx').on(t.accession),
    index('hmis_vault_mrn_idx').on(t.patientMrn),
    index('hmis_vault_status_idx').on(t.status),
  ]
);

export const hmisHospitals = pgTable('hmis_hospitals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

