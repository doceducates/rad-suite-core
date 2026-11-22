import { describe, it, expect } from 'vitest';
import {
  FACULTY_CONSULTANTS,
  findConsultantByName,
  formatConsultantSignature,
  resolveDoctorDesignation,
  cleanDoctorName,
} from '@/lib/consultants';

describe('Faculty Consultants Roster (LGH / PGMI)', () => {
  it('contains exactly 18 official faculty members', () => {
    expect(FACULTY_CONSULTANTS).toHaveLength(18);
  });

  it('includes HOD Prof. Dr. Nighat Haroon', () => {
    const hod = FACULTY_CONSULTANTS.find((c) => c.rank === 'hod');
    expect(hod).toBeDefined();
    expect(hod?.name).toContain('Nighat Haroon');
    expect(hod?.designation).toBe('HOD Radiology');
  });

  it('finds consultant by full or partial name case-insensitively', () => {
    const uzma = findConsultantByName('Dr. Uzma Habib');
    expect(uzma).toBeDefined();
    expect(uzma?.designation).toBe('Associate Professor');

    const partial = findConsultantByName('Ali Mansoor');
    expect(partial).toBeDefined();
    expect(partial?.name).toBe('Dr. Ali Mansoor');
    expect(partial?.qualifications).toContain('FRCR');
  });

  it('formats consultant signature with designation', () => {
    const sig = formatConsultantSignature('Dr. Haroon Saeed');
    expect(sig).toBe('Dr. Haroon Saeed (Assistant Professor)');

    const custom = formatConsultantSignature('Visiting Specialist Dr. John');
    expect(custom).toBe('Visiting Specialist Dr. John');
  });

  it('resolves doctor designation cleanly without duplicating words', () => {
    expect(resolveDoctorDesignation('Dr. Nighat Haroon')).toBe('HOD Radiology');
    expect(resolveDoctorDesignation('Dr. Haroon Saeed')).toBe('Assistant Professor');
    expect(resolveDoctorDesignation('Dr. Uzma Habib')).toBe('Associate Professor');
    expect(resolveDoctorDesignation('Dr. Maria Afzal')).toBe('Senior Registrar');
    expect(resolveDoctorDesignation('Dr. Sehran (SR)')).toBe('Senior Registrar');
    expect(resolveDoctorDesignation('Dr. Jane Doe', 'pgr')).toBe('Resident Radiologist (PGR)');
    expect(resolveDoctorDesignation('Dr. Custom Consultant', 'consultant')).toBe('Consultant Radiologist');
  });

  it('cleans designations immediately following doctor name in parentheses or dashes', () => {
    expect(cleanDoctorName('Dr. Ayesha Asghar (Senior Registrar)')).toBe('Dr. Ayesha Asghar');
    expect(cleanDoctorName('Dr. Sehran (SR)')).toBe('Dr. Sehran');
    expect(cleanDoctorName('Dr. Haroon Saeed (Assistant Professor)')).toBe('Dr. Haroon Saeed');
    expect(cleanDoctorName('Dr. Jane Doe (Resident Radiologist)')).toBe('Dr. Jane Doe');
    expect(cleanDoctorName('Dr. Fatima Iqbal - Assistant Professor')).toBe('Dr. Fatima Iqbal');
    expect(cleanDoctorName('Dr. Uzma Habib')).toBe('Dr. Uzma Habib');
  });
});

