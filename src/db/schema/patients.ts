import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  mrNumber: text('mr_number').notNull().unique(),
  fullName: text('full_name').notNull(),
  dob: text('dob').default('1980-01-01'),
  age: integer('age').notNull().default(0),
  gender: text('gender').notNull().default('Male'),
  phone: text('phone').default(''),
  cnic: text('cnic').default(''),
  guardianName: text('guardian_name').default(''),
  address: text('address').default(''),
  bloodGroup: text('blood_group').default(''),
  allergies: text('allergies').default(''),
  clinicalNotes: text('clinical_notes').default(''),
  hmisAge: integer('hmis_age'),
  dicomAge: integer('dicom_age'),
  ageSource: text('age_source').default('dicom'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
