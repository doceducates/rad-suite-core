import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid institutional email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['consultant', 'pgr', 'admin', 'radiologist', 'resident', 'technologist', 'student']).optional(),
  title: z.string().optional(),
  licenseNo: z.string().optional(),
  department: z.string().optional(),
  inviteCode: z.string().optional(),
  phone: z.string().optional(),
  hospital: z.string().optional(),
});

export const PreRegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(8, 'Phone/WhatsApp number is required'),
  hospital: z.string().min(2, 'Hospital or Institution name is required'),
  roleDesignation: z.string().min(2, 'Clinical role or designation is required'),
  modalitiesOfInterest: z.array(z.string()).optional(),
});

export const CreateInviteCodeSchema = z.object({
  role: z.enum(['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist', 'student', 'service']).optional(),
  allowedScreens: z.array(z.string()).optional(),
  maxUses: z.number().int().min(1).max(1000).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  recipientPhone: z.string().optional(),
  notes: z.string().optional(),
  sendEmail: z.boolean().optional(),
});

export const RedeemInviteSchema = z.object({
  inviteCode: z.string().min(3, 'Invite code is required'),
});

export const UpdateUserRbacSchema = z.object({
  role: z.enum(['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist', 'student', 'service']).optional(),
  status: z.enum(['active', 'waitlisted', 'pending_invite', 'suspended']).optional(),
  allowedScreens: z.array(z.string()).optional(),
  allowedStorageSources: z.array(z.string()).optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  hospital: z.string().optional(),
  phone: z.string().optional(),
});

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid institutional email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist', 'student', 'service']).default('consultant'),
  status: z.enum(['active', 'waitlisted', 'pending_invite', 'suspended']).default('active'),
  allowedScreens: z.array(z.string()).optional(),
  allowedStorageSources: z.array(z.string()).optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  hospital: z.string().optional(),
  phone: z.string().optional(),
  licenseNo: z.string().optional(),
});

export const BatchUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user must be selected'),
  action: z.enum(['activate', 'suspend', 'delete']),
});

