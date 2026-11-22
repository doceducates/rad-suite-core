import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  uploadStudyToUserGoogleDrive,
  downloadStudyFromUserGoogleDrive,
} from '../gdrive-study-upload.service';
import { encryptSecret } from '@/lib/crypto';

describe('Google Drive Study Upload Service', () => {
  let userIdWithoutDrive: string;
  let userIdWithDrive: string;

  beforeEach(async () => {
    userIdWithoutDrive = crypto.randomUUID();
    userIdWithDrive = crypto.randomUUID();

    await db.insert(users).values({
      id: userIdWithoutDrive,
      name: 'Unconnected User',
      email: `unconnected-${crypto.randomBytes(3).toString('hex')}@radsuite.pk`,
      passwordHash: 'dummy',
      role: 'radiologist',
      createdAt: new Date(),
    } as any);

    await db.insert(users).values({
      id: userIdWithDrive,
      name: 'Connected User',
      email: `connected-${crypto.randomBytes(3).toString('hex')}@radsuite.pk`,
      passwordHash: 'dummy',
      role: 'radiologist',
      googleEmail: 'connected@radsuite.pk',
      googleRefreshToken: encryptSecret('fake-refresh'),
      googleAccessToken: 'fake-access-token',
      googleTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date(),
    } as any);
  });

  it('fails safely when user does not have Google Drive linked', async () => {
    const res = await uploadStudyToUserGoogleDrive({
      userId: userIdWithoutDrive,
      accessionNumber: 'ACC-1234',
      patientName: 'Jane Doe',
      modality: 'CT',
      zipBuffer: Buffer.from('fake zip data'),
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('does not have an active Google Drive token');
  });

  it('throws when attempting to download study from user without linked Drive', async () => {
    await expect(
      downloadStudyFromUserGoogleDrive(userIdWithoutDrive, 'fake-file-id')
    ).rejects.toThrow('Google Drive account not linked or expired');
  });
});
