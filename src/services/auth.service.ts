import crypto from 'crypto';
import { eq, and, gt, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db, IS_SQLITE } from '@/db';
import { users, sessions, inviteCodes } from '@/db/schema';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import type { User, UserRole } from '@/types';
import { inviteService } from './invite.service';
import { config } from '@/lib/config';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, hashPassword, verifyPassword } from './auth-crypto';

export { SESSION_COOKIE_NAME, SESSION_TTL_MS, hashPassword, verifyPassword };

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Rotate session: purge old sessions for this user
  await db.delete(sessions).where(eq(sessions.userId, userId));

  await db.insert(sessions).values({ token, userId, expiresAt, createdAt: new Date() });

  try {
    const jar = await cookies();
    jar.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.IS_DESKTOP !== '1',
      path: '/',
      expires: expiresAt,
    });
  } catch {}

  return token;
}

export async function destroySession(): Promise<void> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE_NAME)?.value;
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    jar.delete(SESSION_COOKIE_NAME);
  } catch {}
}

const DEV_FALLBACK_USER: User & { hmisPassword?: string } = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@radsuite.local',
  name: 'Lead Radiologist',
  role: 'admin',
  title: 'Consultant Radiologist',
  licenseNo: 'REG-00001',
  department: 'Radiology',
  avatarColor: '#0ea5e9',
  hmisHospitalId: '',
  hmisUsername: undefined,
  hmisReportingDoctorName: 'Lead Radiologist',
  supervisingConsultantName: undefined,
  hasHmisPassword: false,
  createdAt: new Date(),
};

function mapDbUserToUser(u: any): User {
  let screens = ['*'];
  try {
    if (u.allowedScreens) screens = JSON.parse(u.allowedScreens);
  } catch {}

  let storageSources = ['local', 'gdrive'];
  try {
    if (u.allowedStorageSources) storageSources = JSON.parse(u.allowedStorageSources);
    else if (u.role === 'admin') storageSources = ['*'];
  } catch {}

  return {
    id: u.id,
    tenantId: u.tenantId || 'tnt_lgh',
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    status: (u.status || 'active') as any,
    phone: u.phone ?? undefined,
    hospital: u.hospital ?? undefined,
    allowedScreens: screens,
    allowedStorageSources: storageSources,
    inviteCodeUsed: u.inviteCodeUsed ?? undefined,
    invitedBy: u.invitedBy ?? undefined,
    activatedAt: u.activatedAt ? new Date(u.activatedAt) : undefined,
    title: u.title ?? 'Resident Radiologist',
    licenseNo: u.licenseNo ?? '',
    department: u.department ?? 'Radiology',
    avatarColor: u.avatarColor,
    hmisHospitalId: u.hmisHospitalId ?? undefined,
    hmisUsername: u.hmisUsername ?? undefined,
    hmisReportingDoctorName: u.hmisReportingDoctorName ?? u.name ?? undefined,
    supervisingConsultantName: u.supervisingConsultantName ?? undefined,
    hasHmisPassword: Boolean(u.hmisPassword),
    googleEmail: u.googleEmail ?? undefined,
    googleConnected: Boolean(u.googleRefreshToken),
    googleAutoSync: Boolean(u.googleAutoSync),
    googleRootFolderId: u.googleRootFolderId ?? undefined,
    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
  };
}

export async function verifySession(token: string): Promise<{ user: User } | null> {
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (rows[0]?.user) {
    return { user: mapDbUserToUser(rows[0].user) };
  }
  return null;
}

export async function getCurrentUser(): Promise<User | null> {
  let isRequestContext = false;
  let token: string | undefined;
  try {
    const jar = await cookies();
    isRequestContext = true;
    token = jar.get(SESSION_COOKIE_NAME)?.value || jar.get('rad_session')?.value;
  } catch {
    // Non-request context (e.g. CLI, vitest runner)
  }
  if (token) {
    const session = await verifySession(token);
    if (session?.user) return session.user;
  }

  // If inside a Next.js web request without a valid session token, visitor is unauthenticated
  if (isRequestContext) {
    return null;
  }

  // Non-production fallback strictly for non-request contexts
  if (process.env.NODE_ENV !== 'production') {
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
      if (dbUser) return mapDbUserToUser(dbUser);
    } catch {}

    const { hmisPassword: _, ...sanitizedFallback } = DEV_FALLBACK_USER as any;
    return {
      ...sanitizedFallback,
      hasHmisPassword: Boolean(DEV_FALLBACK_USER.hmisPassword),
    };
  }

  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const [u] = await db.select().from(users).where(eq(users.id, id as any)).limit(1);
    if (u) return mapDbUserToUser(u);
  } catch {}
  return null;
}

export async function updateUserProfile(
  userId: string,
  input: Partial<Pick<User, 'name' | 'licenseNo' | 'title' | 'department' | 'hmisHospitalId' | 'hmisUsername' | 'hmisReportingDoctorName' | 'supervisingConsultantName' | 'role' | 'allowedScreens' | 'allowedStorageSources'>> & {
    hmisPassword?: string;
  }
): Promise<User> {
  const updates: Record<string, any> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.licenseNo !== undefined) updates.licenseNo = input.licenseNo.trim();
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.department !== undefined) updates.department = input.department.trim();
  if (input.role !== undefined) updates.role = input.role;
  if (input.allowedScreens !== undefined) {
    updates.allowedScreens = Array.isArray(input.allowedScreens) ? JSON.stringify(input.allowedScreens) : input.allowedScreens;
  }
  if (input.allowedStorageSources !== undefined) {
    updates.allowedStorageSources = Array.isArray(input.allowedStorageSources) ? JSON.stringify(input.allowedStorageSources) : input.allowedStorageSources;
  }
  if (input.hmisHospitalId !== undefined) updates.hmisHospitalId = input.hmisHospitalId.trim();
  if (input.hmisUsername !== undefined) updates.hmisUsername = input.hmisUsername.trim();
  if (input.hmisReportingDoctorName !== undefined) updates.hmisReportingDoctorName = input.hmisReportingDoctorName.trim();
  if (input.supervisingConsultantName !== undefined) updates.supervisingConsultantName = input.supervisingConsultantName.trim();
  if (input.hmisPassword !== undefined && input.hmisPassword.trim().length > 0) {
    updates.hmisPassword = encryptSecret(input.hmisPassword.trim());
  }

  if (userId === DEV_FALLBACK_USER.id) {
    Object.assign(DEV_FALLBACK_USER, updates);
  }

  try {
    await db.update(users).set(updates).where(eq(users.id, userId as any));
  } catch (err: any) {
    if (userId !== DEV_FALLBACK_USER.id) throw err;
  }

  const updated = await getCurrentUser();
  if (!updated) {
    throw new Error('User not found after update');
  }
  return updated;
}

export async function getUserHmisCredentials(userId?: string): Promise<{
  hospitalId: string;
  username: string;
  password?: string;
  reportingDoctorName?: string;
}> {
  let target: any = null;
  if (userId && userId !== 'api-service-account') {
    const [u] = await db
      .select({ hmisHospitalId: users.hmisHospitalId, hmisUsername: users.hmisUsername, hmisPassword: users.hmisPassword, hmisReportingDoctorName: users.hmisReportingDoctorName, name: users.name })
      .from(users).where(eq(users.id, userId as any)).limit(1);
    if (u?.hmisUsername && u?.hmisPassword) target = u;
  }
  if (!target) {
    const [adm] = await db
      .select({ hmisHospitalId: users.hmisHospitalId, hmisUsername: users.hmisUsername, hmisPassword: users.hmisPassword, hmisReportingDoctorName: users.hmisReportingDoctorName, name: users.name })
      .from(users).where(sql`${users.hmisUsername} IS NOT NULL AND ${users.hmisPassword} IS NOT NULL AND ${users.hmisUsername} != ''`).limit(1);
    target = adm;
  }
  const pass = target?.hmisPassword ? decryptSecret(target.hmisPassword) : '';
  return {
    hospitalId: target?.hmisHospitalId || '19',
    username: target?.hmisUsername || '',
    password: pass || undefined,
    reportingDoctorName: target?.hmisReportingDoctorName || target?.name || undefined,
  };
}


export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  title?: string;
  licenseNo?: string;
  department?: string;
  inviteCode?: string;
  phone?: string;
  hospital?: string;
}

export async function registerUser(input: RegisterUserInput): Promise<{ user: User; sessionToken: string }> {
  const emailNorm = input.email.trim().toLowerCase();

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, emailNorm)).limit(1);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  // First-user Admin bootstrap check (strictly opt-in via BOOTSTRAP_ADMIN env)
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  const isFirstUser = existingUsers.length === 0;

  let assignedRole: UserRole;
  let assignedTitle: string;
  let assignedStatus: 'active' | 'waitlisted' = 'waitlisted';
  let allowedScreens = JSON.stringify(['my_cases', 'worklist', 'workstation', 'studio']);
  let inviteCodeUsed: string | undefined = undefined;

  if (input.inviteCode && input.inviteCode.trim().length > 0) {
    const val = await inviteService.validateInviteCode(input.inviteCode);
    if (!val.valid || !val.invite) {
      throw new Error(val.reason || 'Invalid or expired alpha invite code');
    }
    assignedStatus = 'active';
    assignedRole = (val.invite.role as UserRole) || (input.role === 'pgr' ? 'pgr' : 'consultant');
    assignedTitle = input.title?.trim() || (assignedRole === 'pgr' ? 'Resident Radiologist (PGR)' : 'Consultant Radiologist');
    allowedScreens = val.invite.allowedScreens || allowedScreens;
    inviteCodeUsed = val.invite.code;

    // Increment invite usage
    await db
      .update(inviteCodes)
      .set({ usesCount: (Number(val.invite.usesCount || 0) + 1) as any })
      .where(eq(inviteCodes.id, val.invite.id));
  } else if (isFirstUser && (process.env.BOOTSTRAP_ADMIN === 'true' || process.env.NODE_ENV === 'test')) {
    assignedRole = 'admin';
    assignedTitle = input.title?.trim() || 'System Administrator';
    assignedStatus = 'active';
    allowedScreens = JSON.stringify(['*']);
  } else if (config.isAtlasMode || input.role === 'student') {
    assignedRole = 'student';
    assignedTitle = input.title?.trim() || 'Medical Student / Anatomy Learner';
    assignedStatus = 'active';
    allowedScreens = JSON.stringify(['dashboard', 'atlas', 'settings']);
  } else {
    assignedRole = input.role === 'pgr' || input.role === 'resident' ? 'pgr' : 'consultant';
    assignedTitle = input.title?.trim() || (assignedRole === 'pgr' ? 'Resident Radiologist (PGR)' : 'Consultant Radiologist');
    assignedStatus = 'waitlisted';
  }

  const passwordHash = await hashPassword(input.password);
  const newUserId = crypto.randomUUID();
  const avatarColors = ['#4a7c59', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#8ecf9e'];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  await db.insert(users).values({
    id: newUserId,
    name: input.name.trim(),
    email: emailNorm,
    passwordHash,
    role: assignedRole,
    title: assignedTitle,
    status: assignedStatus,
    phone: input.phone?.trim() || null,
    hospital: input.hospital?.trim() || null,
    allowedScreens,
    inviteCodeUsed: inviteCodeUsed || null,
    licenseNo: input.licenseNo?.trim() || '',
    department: input.department?.trim() || 'Radiology',
    avatarColor,
    createdAt: new Date(),
  } as any);

  const sessionToken = await createSession(newUserId);

  let parsedScreens = ['*'];
  try { parsedScreens = JSON.parse(allowedScreens); } catch {}

  const user: User = {
    id: newUserId, name: input.name.trim(), email: emailNorm, role: assignedRole,
    title: assignedTitle, status: assignedStatus, phone: input.phone?.trim(),
    hospital: input.hospital?.trim(), allowedScreens: parsedScreens, inviteCodeUsed,
    licenseNo: input.licenseNo?.trim() || '', department: input.department?.trim() || 'Radiology',
    avatarColor, createdAt: new Date(),
  };

  return { user, sessionToken };
}

