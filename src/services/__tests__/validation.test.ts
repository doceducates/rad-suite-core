import { describe, it, expect } from 'vitest';
import { LoginSchema, ReportUpdateSchema, PatientCreateSchema, HmisWorklistQuerySchema } from '@/lib/validation';

describe('Validation Schemas (Security Layer)', () => {
  it('should accept valid login credentials with email or username', () => {
    const validEmail = { email: 'doctor@example.com', password: 'SecurePassword123!' };
    expect(LoginSchema.safeParse(validEmail).success).toBe(true);

    const validUsername = { email: 'Dr.JaneDoe', password: 'SecurePassword123!' };
    expect(LoginSchema.safeParse(validUsername).success).toBe(true);
  });

  it('should reject empty email or username identifier', () => {
    const invalid = { email: '', password: 'SecurePassword123!' };
    const result = LoginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject short passwords (< 6 chars)', () => {
    const invalid = { email: 'doc@test.pk', password: '123' };
    const result = LoginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept valid report status transition and clinicalHistory', () => {
    const update = {
      status: 'final',
      criticalFinding: true,
      clinicalHistory: 'Patient presents with lumbar radiating pain.',
    };
    const result = ReportUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clinicalHistory).toBe('Patient presents with lumbar radiating pain.');
    }
  });

  it('should reject invalid report status', () => {
    const invalid = { status: 'non_existent_status' };
    const result = ReportUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate patient age boundary', () => {
    const valid = { fullName: 'Ali Khan', age: 45, gender: 'Male' };
    expect(PatientCreateSchema.safeParse(valid).success).toBe(true);

    const invalidAge = { fullName: 'Ali Khan', age: 150, gender: 'Male' };
    expect(PatientCreateSchema.safeParse(invalidAge).success).toBe(false);
  });

  it('should parse and apply defaults for HmisWorklistQuerySchema', () => {
    const emptyQuery = {};
    const parsed = HmisWorklistQuerySchema.safeParse(emptyQuery);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.perPage).toBe(50);
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.fetchAllPages).toBe(false);
    }

    const customQuery = {
      modality: 'CT',
      serviceType: 'ER',
      perPage: '100',
      page: '2',
      startDate: '2026-10-01 00:00:00',
      endDate: '2026-10-04 23:59:59',
      fetchAllPages: 'true',
    };
    const customParsed = HmisWorklistQuerySchema.safeParse(customQuery);
    expect(customParsed.success).toBe(true);
    if (customParsed.success) {
      expect(customParsed.data.modality).toBe('CT');
      expect(customParsed.data.serviceType).toBe('ER');
      expect(customParsed.data.perPage).toBe(100);
      expect(customParsed.data.page).toBe(2);
      expect(customParsed.data.fetchAllPages).toBe(true);
    }
  });

  it('should normalize gender single char (M/F) and string ages in ReportUpdateSchema', () => {
    const rawPayload = {
      gender: 'M',
      age: '35',
      findings: 'No acute intracranial hemorrhage.',
      impression: 'Normal study.',
      status: 'draft',
    };
    const parsed = ReportUpdateSchema.safeParse(rawPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.gender).toBe('Male');
      expect(parsed.data.age).toBe(35);
    }

    const femalePayload = { gender: 'f', age: '' };
    const parsedFemale = ReportUpdateSchema.safeParse(femalePayload);
    expect(parsedFemale.success).toBe(true);
    if (parsedFemale.success) {
      expect(parsedFemale.data.gender).toBe('Female');
      expect(parsedFemale.data.age).toBeUndefined();
    }
  });

  it('should accept boolean, number (0/1), and string representations for criticalFinding and isAutoSave', () => {
    // Number representations from SQLite integer boolean columns
    const numPayload1 = { criticalFinding: 1, isAutoSave: 1 };
    const res1 = ReportUpdateSchema.safeParse(numPayload1);
    expect(res1.success).toBe(true);
    if (res1.success) {
      expect(res1.data.criticalFinding).toBe(true);
      expect(res1.data.isAutoSave).toBe(true);
    }

    const numPayload0 = { criticalFinding: 0, isAutoSave: 0 };
    const res0 = ReportUpdateSchema.safeParse(numPayload0);
    expect(res0.success).toBe(true);
    if (res0.success) {
      expect(res0.data.criticalFinding).toBe(false);
      expect(res0.data.isAutoSave).toBe(false);
    }

    // String representations
    const strPayload = { criticalFinding: 'true', isAutoSave: 'false' };
    const resStr = ReportUpdateSchema.safeParse(strPayload);
    expect(resStr.success).toBe(true);
    if (resStr.success) {
      expect(resStr.data.criticalFinding).toBe(true);
      expect(resStr.data.isAutoSave).toBe(false);
    }

    const strNumPayload = { criticalFinding: '1', isAutoSave: '0' };
    const resStrNum = ReportUpdateSchema.safeParse(strNumPayload);
    expect(resStrNum.success).toBe(true);
    if (resStrNum.success) {
      expect(resStrNum.data.criticalFinding).toBe(true);
      expect(resStrNum.data.isAutoSave).toBe(false);
    }
  });
});

