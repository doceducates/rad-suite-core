import { describe, it, expect } from 'vitest';
import { db } from '@/db';
import { users, hmisHospitals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HMIS_HOSPITALS } from '@/services/hmis/hmis-hospitals.data';

describe('User HMIS Profile & Hospitals Database Parity', () => {
  it('should have hmisHospitalId and hmisUsername fields in the users schema', () => {
    expect(users).toBeDefined();
    // Check Drizzle column keys
    expect(users.hmisHospitalId).toBeDefined();
    expect(users.hmisUsername).toBeDefined();
  });

  it('should have hmisHospitals schema defined', () => {
    expect(hmisHospitals).toBeDefined();
    expect(hmisHospitals.id).toBeDefined();
    expect(hmisHospitals.name).toBeDefined();
  });

  it('should seed or provide all 78 hospitals in hmisHospitals table', async () => {
    const rows = await db.select().from(hmisHospitals);
    expect(rows.length).toBeGreaterThanOrEqual(78);
    const lgh = rows.find((r) => r.id === '19');
    expect(lgh?.name).toBe('Lahore General Hospital, Lahore');
  });
});
