// Layer 2 (Domain/Services): Multi-Tenant Case Storage Routing & Quota Governance
import { db } from '@/db';
import { users, hospitalPacsStudies, hotStagedStudies } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type StorageDestination = 'vps_s3' | 'google_drive';

export interface UserStorageTarget {
  userId: string;
  role: string;
  destination: StorageDestination;
  canClaim: boolean;
  reason?: string;
  googleEmail?: string | null;
  googleRootFolderId?: string | null;
  googleDriveFolderIdCases?: string | null;
}

/**
 * Resolves the assigned storage tier for a specific user:
 * - Admin users utilize the central VPS SSD and custom S3 cloud archive.
 * - Non-admin clinicians (radiologist, resident) MUST save cases to their personal Google Drive.
 */
export async function getUserStorageTarget(userId: string): Promise<UserStorageTarget> {
  const [u] = await db
    .select({
      id: users.id,
      role: users.role,
      googleRefreshToken: users.googleRefreshToken,
      googleEmail: users.googleEmail,
      googleRootFolderId: users.googleRootFolderId,
      googleDriveFolderIdCases: users.googleDriveFolderIdCases,
      storageProvider: users.storageProvider,
    })
    .from(users)
    .where(eq(users.id, userId as any))
    .limit(1);

  if (!u) {
    return {
      userId,
      role: 'unknown',
      destination: 'google_drive',
      canClaim: false,
      reason: 'USER_NOT_FOUND',
    };
  }

  // 1. If user explicitly configured google_drive storage provider:
  if (u.storageProvider === 'google_drive') {
    const hasGoogleDrive = Boolean(u.googleRefreshToken);
    if (!hasGoogleDrive) {
      return {
        userId: u.id,
        role: u.role,
        destination: 'google_drive',
        canClaim: false,
        reason: 'GOOGLE_DRIVE_REQUIRED',
      };
    }
    return {
      userId: u.id,
      role: u.role,
      destination: 'google_drive',
      canClaim: true,
      googleEmail: u.googleEmail,
      googleRootFolderId: u.googleRootFolderId,
      googleDriveFolderIdCases: u.googleDriveFolderIdCases,
    };
  }

  // 2. Admin users default to the central VPS and Admin S3 storage
  if (u.role === 'admin' || u.storageProvider === 'vps_s3') {
    return {
      userId: u.id,
      role: u.role,
      destination: 'vps_s3',
      canClaim: true,
    };
  }

  // Non-admin users require an active Google Drive connection for personal storage isolation
  const hasGoogleDrive = Boolean(u.googleRefreshToken);
  if (!hasGoogleDrive) {
    return {
      userId: u.id,
      role: u.role,
      destination: 'google_drive',
      canClaim: false,
      reason: 'GOOGLE_DRIVE_REQUIRED',
    };
  }

  return {
    userId: u.id,
    role: u.role,
    destination: 'google_drive',
    canClaim: true,
    googleEmail: u.googleEmail,
    googleRootFolderId: u.googleRootFolderId,
    googleDriveFolderIdCases: u.googleDriveFolderIdCases,
  };
}

/**
 * Associates an ingested or claimed case with the user's storage tier.
 * Non-admin cases are marked as `isEphemeralVps: true` for automatic post-upload pruning.
 */
export async function tagCaseForUserStorage(accessionNumber: string, userId: string): Promise<void> {
  const target = await getUserStorageTarget(userId);
  const isEphemeral = target.destination === 'google_drive';

  try {
    // 1. Tag hot staged study table if present
    await db
      .update(hotStagedStudies)
      .set({
        storageTargetUserId: userId,
        isEphemeralVps: isEphemeral,
      } as any)
      .where(eq(hotStagedStudies.accessionNumber, accessionNumber));
  } catch (err) {
    console.warn('[STORAGE_ROUTER] Failed to tag hotStagedStudies:', err);
  }

  try {
    // 2. Tag hospital PACS catalog table if present
    await db
      .update(hospitalPacsStudies)
      .set({
        storageTargetUserId: userId,
        isEphemeralVps: isEphemeral,
      } as any)
      .where(eq(hospitalPacsStudies.accessionNumber, accessionNumber));
  } catch (err) {
    console.warn('[STORAGE_ROUTER] Failed to tag hospitalPacsStudies:', err);
  }
}
