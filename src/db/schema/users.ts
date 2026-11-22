import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull().default('tnt_lgh'),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('radiologist'), // admin | radiologist | resident | technologist
  status: text('status').notNull().default('pending_invite'), // active | waitlisted | pending_invite | suspended
  phone: text('phone'),
  hospital: text('hospital'),
  allowedScreens: text('allowed_screens'), // JSON array string e.g. '["my_cases","worklist","workstation"]' or '["*"]'
  allowedStorageSources: text('allowed_storage_sources'), // JSON array string e.g. '["local","gdrive"]' or '["*"]'
  inviteCodeUsed: text('invite_code_used'),
  invitedBy: text('invited_by'),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
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
  googleTokenExpiresAt: timestamp('google_token_expires_at', { withTimezone: true }),
  googleRootFolderId: text('google_root_folder_id'),
  googleDriveFolderIdCases: text('google_drive_folder_id_cases'),
  googleAutoSync: boolean('google_auto_sync').notNull().default(false),
  storageProvider: text('storage_provider').notNull().default('auto'), // 'auto' | 'vps_s3' | 'google_drive'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  role: text('role').notNull().default('radiologist'),
  allowedScreens: text('allowed_screens').notNull().default('["my_cases","worklist","workstation"]'),
  maxUses: text('max_uses').notNull().default('1'),
  usesCount: text('uses_count').notNull().default('0'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  recipientName: text('recipient_name'),
  recipientEmail: text('recipient_email'),
  recipientPhone: text('recipient_phone'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const preRegistrations = pgTable('pre_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  hospital: text('hospital').notNull(),
  roleDesignation: text('role_designation').notNull(),
  modalitiesOfInterest: text('modalities_of_interest'), // JSON string e.g. '["CT","MRI"]'
  status: text('status').notNull().default('waitlisted'), // waitlisted | invited | converted | rejected
  inviteCodeSent: text('invite_code_sent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  token: text('token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
