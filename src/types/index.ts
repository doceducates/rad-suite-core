export type UserRole =
  | 'admin'
  | 'consultant'
  | 'pgr'
  | 'radiologist'
  | 'resident'
  | 'technologist'
  | 'student'
  | 'service';

export type UserStatus = 'active' | 'waitlisted' | 'pending_invite' | 'suspended';

export type PendingReason =
  | 'awaiting_prior_images'
  | 'awaiting_lab_creatinine'
  | 'missing_history_form'
  | 'technologist_ack_pending'
  | 'pacs_transfer_pending'
  | 'motion_artifact_repeat'
  | 'awaiting_clinical_history'
  | 'second_opinion_subspecialty'
  | 'study_case'
  | 'other';

export interface User {
  id: string;
  tenantId?: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  licenseNo?: string;
  department?: string;
  avatarColor?: string;
  status?: UserStatus;
  phone?: string;
  hospital?: string;
  allowedScreens?: string[];
  allowedStorageSources?: string[];
  inviteCodeUsed?: string;
  invitedBy?: string;
  activatedAt?: Date;
  hmisHospitalId?: string;
  hmisUsername?: string;
  hmisReportingDoctorName?: string;
  supervisingConsultantName?: string;
  hasHmisPassword?: boolean;
  googleEmail?: string;
  googleConnected?: boolean;
  googleAutoSync?: boolean;
  googleRootFolderId?: string;
  createdAt: Date;
}

export interface InviteCode {
  id: string;
  code: string;
  role: UserRole;
  allowedScreens: string[];
  maxUses: number;
  usesCount: number;
  expiresAt?: Date | null;
  createdBy?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
}

export interface PreRegistration {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  hospital: string;
  roleDesignation: string;
  modalitiesOfInterest: string[];
  status: 'waitlisted' | 'invited' | 'converted' | 'rejected';
  inviteCodeSent?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type Priority = 'routine' | 'urgent' | 'stat';
export type StudyStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ReportStatus = 'scheduled' | 'draft' | 'preliminary' | 'pending' | 'submitted' | 'final' | 'amended';

export type Modality = 'CT' | 'MRI' | 'X-Ray' | 'Ultrasound' | 'Mammography' | 'DEXA' | 'Fluoroscopy';

export interface Patient {
  id: string;
  mrNumber: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  phone?: string;
  cnic?: string;
  guardianName?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  clinicalNotes?: string;
  createdAt: Date;
}

export interface Study {
  id: string;
  accessionNumber: string;
  patientId: string;
  modality: Modality;
  scanType: string;
  bodyPart: string;
  priority: Priority;
  status: StudyStatus;
  scheduledAt: Date;
  referringDoctor?: string;
  clinicalHistory?: string;
  contrastUsed: boolean;
  contrastAgent?: string;
  contrastVolumeMl?: number;
  machineId?: string;
  technologist?: string;
  assignedRadiologistId?: string;
  createdAt: Date;
}

export interface Report {
  id: string;
  studyId: string;
  patientId: string;
  authorId: string;
  status: ReportStatus;
  technique?: string;
  comparison?: string;
  findings?: string;
  impression?: string;
  recommendation?: string;
  contentJson?: any;
  criticalFinding: boolean;
  signedAt?: Date;
  signedBy?: string;
  pendingReason?: PendingReason | string;
  pendingNotes?: string;
  pendingAt?: Date;
  pendingBy?: string;
  pgrDraftFindings?: string;
  pgrDraftImpression?: string;
  pgrAuthorId?: string;
  pgrSubmittedAt?: Date;
  googleDocId?: string;
  googleDocUrl?: string;
  googleSyncedAt?: Date;
  googleSyncStatus?: 'none' | 'synced' | 'error' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRevision {
  id: string;
  reportId: string;
  version: number;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  status: string;
  findings?: string;
  impression?: string;
  technique?: string;
  recommendation?: string;
  notes?: string;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export * from './anatomy';

