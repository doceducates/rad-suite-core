import { pgTable, text, timestamp, integer, uuid, jsonb } from 'drizzle-orm/pg-core';
import { patients } from './patients';
import { studies } from './studies';

export const intakeDocuments = pgTable('intake_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull().default('Requisition Slip'),
  sourceType: text('source_type').notNull().default('upload'), // upload | camera
  imageData: text('image_data').default(''),
  rawText: text('raw_text').default(''),
  extractedJson: jsonb('extracted_json'),
  confidence: integer('confidence').notNull().default(0),
  status: text('status').notNull().default('extracted'), // extracted | linked | dismissed
  patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),
  studyId: uuid('study_id').references(() => studies.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
