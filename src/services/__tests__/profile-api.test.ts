import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCurrentUser, updateUserProfile } from '../auth.service';
import { getHmisHospitalById } from '../hmis/hmis-hospitals.data';

describe('User Profile & HMIS Preferences Service', () => {
  let initialProfile: any = null;

  beforeAll(async () => {
    const user = await getCurrentUser();
    if (user) {
      initialProfile = {
        hmisHospitalId: user.hmisHospitalId,
        hmisUsername: user.hmisUsername,
      };
    }
  });

  afterAll(async () => {
    const user = await getCurrentUser();
    if (user && initialProfile) {
      await updateUserProfile(user.id, initialProfile);
    }
  });

  it('should return hmisHospitalId and hmisUsername on currentUser', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();
    expect(user?.hmisHospitalId).toBeDefined();
  });

  it('should update user profile HMIS hospital ID and username', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();
    if (!user) return;

    const updated = await updateUserProfile(user.id, {
      hmisHospitalId: '22', // Jinnah Hospital
      hmisUsername: 'dr.jinnah.rad',
    });

    expect(updated.hmisHospitalId).toBe('22');
    expect(updated.hmisUsername).toBe('dr.jinnah.rad');

    const hosp = getHmisHospitalById(updated.hmisHospitalId!);
    expect(hosp?.name).toBe('Jinnah Hospital, Lahore');
  });

  it('should preserve exact case sensitivity for HMIS username', async () => {
    const user = await getCurrentUser();
    if (!user) return;

    // Reset back to LGH (19) with exact case Dr.JaneDoe
    const reset = await updateUserProfile(user.id, {
      hmisHospitalId: '19',
      hmisUsername: 'Dr.JaneDoe',
    });
    expect(reset.hmisHospitalId).toBe('19');
    expect(reset.hmisUsername).toBe('Dr.JaneDoe');
  });

  it('should update and persist clinician name and clinical designation', async () => {
    const user = await getCurrentUser();
    expect(user).toBeDefined();
    if (!user) return;

    const updated = await updateUserProfile(user.id, {
      name: 'Dr. Jane Doe',
      title: 'Resident Radiologist (PGR)',
      department: 'Radiology & Imaging Sciences',
    });

    expect(updated.name).toBe('Dr. Jane Doe');
    expect(updated.title).toBe('Resident Radiologist (PGR)');
    expect(updated.department).toBe('Radiology & Imaging Sciences');

    const verified = await getCurrentUser();
    expect(verified?.name).toBe('Dr. Jane Doe');
    expect(verified?.title).toBe('Resident Radiologist (PGR)');
  });
});
