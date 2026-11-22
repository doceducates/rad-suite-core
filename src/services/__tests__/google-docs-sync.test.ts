import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatClinicalReportHtml, syncReportToGoogleDocs } from '../google-docs-sync.service';
import { linkUserGoogleAccount } from '../google-auth.service';
import { db } from '@/db';
import { users, patients, studies, reports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

describe('Google Docs Report Formatting & Sync Service', () => {
  let testUserId: string;
  let testPatientId: string;
  let testStudyId: string;
  let testReportId: string;

  beforeEach(async () => {
    vi.restoreAllMocks();

    testUserId = crypto.randomUUID();
    testPatientId = crypto.randomUUID();
    testStudyId = crypto.randomUUID();
    testReportId = crypto.randomUUID();

    // Seed test entities
    await db.insert(users).values({
      id: testUserId,
      name: 'Dr. Jane Doe',
      email: `doctor-${crypto.randomUUID()}@radsuite.pk`,
      passwordHash: 'dummyhash',
      role: 'radiologist',
      department: 'Department of Diagnostic Radiology',
      createdAt: new Date(),
    } as any);

    await db.insert(patients).values({
      id: testPatientId,
      mrNumber: `MRN-${Date.now()}`,
      fullName: 'Ahmad Khan',
      dob: '1985-05-15',
      age: 41,
      gender: 'Male',
      createdAt: new Date(),
    } as any);

    await db.insert(studies).values({
      id: testStudyId,
      patientId: testPatientId,
      accessionNumber: `ACC-${Date.now()}`,
      modality: 'CT',
      scanType: 'CT Chest with IV Contrast',
      bodyPart: 'Chest',
      status: 'scheduled',
      scheduledAt: new Date(),
      createdAt: new Date(),
    } as any);

    await db.insert(reports).values({
      id: testReportId,
      studyId: testStudyId,
      patientId: testPatientId,
      authorId: testUserId,
      status: 'final',
      clinicalHistory: 'Persistent cough for 3 weeks',
      technique: 'Helical CT acquisition from lung apices to diaphragm with 70ml IV contrast.',
      findings: '<p>Lungs are clear. No focal consolidation, pneumothorax, or pleural effusion.</p>',
      impression: '<p>Normal contrast-enhanced CT examination of the chest.</p>',
      criticalFinding: false,
      signedBy: 'Dr. Jane Doe',
      signedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  afterEach(async () => {
    try {
      if (testReportId) await db.delete(reports).where(eq(reports.id, testReportId));
      if (testStudyId) await db.delete(studies).where(eq(studies.id, testStudyId));
      if (testPatientId) await db.delete(patients).where(eq(patients.id, testPatientId));
      if (testUserId) await db.delete(users).where(eq(users.id, testUserId));
    } catch {}
  });

  it('generates high-fidelity clinical report HTML with patient demographics and sections', () => {
    const html = formatClinicalReportHtml({
      hospitalName: 'LGH LAHORE RADIOLOGY',
      department: 'Department of Radiology',
      patientName: 'Ahmad Khan',
      patientMrn: 'MRN-99881',
      age: 41,
      gender: 'Male',
      accessionNumber: 'ACC-88219',
      modality: 'CT',
      scanType: 'CT Chest with IV Contrast',
      studyDate: '2026-10-04',
      clinicalHistory: 'Persistent cough for 3 weeks',
      technique: 'Helical CT scanning with contrast',
      findings: '<p>Lungs are clear.</p>',
      impression: '<p>Normal study.</p>',
      criticalFinding: false,
      signedBy: 'Dr. Jane Doe',
      status: 'final',
    });

    expect(html).toContain('LGH LAHORE RADIOLOGY');
    expect(html).toContain('Ahmad Khan');
    expect(html).toContain('MRN-99881');
    expect(html).toContain('ACC-88219');
    expect(html).toContain('Persistent cough for 3 weeks');
    expect(html).toContain('Lungs are clear.');
    expect(html).toContain('Normal study.');
    expect(html).toContain('Dr. Jane Doe');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('fails gracefully when user has not connected a Google account', async () => {
    const result = await syncReportToGoogleDocs({
      reportId: testReportId,
      userId: testUserId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Google account is not connected');
  });

  it('creates native Google Doc and persists doc ID and URL to database', async () => {
    await linkUserGoogleAccount(testUserId, {
      accessToken: 'ya29.valid-google-token',
      refreshToken: '1//refresh-token',
      expiresIn: 3600,
      email: 'clinician@hospital.org',
    });

    const mockFetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      // Find or create taxonomy folders
      if (url.includes('drive/v3/files') && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => ({ files: [{ id: 'tax-folder-id' }] }) });
      }
      // Multipart upload create Google Doc
      if (url.includes('upload/drive/v3/files')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'generated-doc-id-999',
            webViewLink: 'https://docs.google.com/document/d/generated-doc-id-999/edit',
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ id: 'default-id' }) });
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await syncReportToGoogleDocs({
      reportId: testReportId,
      userId: testUserId,
    });

    expect(result.success).toBe(true);
    expect(result.googleDocId).toBe('generated-doc-id-999');
    expect(result.googleDocUrl).toBe('https://docs.google.com/document/d/generated-doc-id-999/edit');

    // Verify database record was updated
    const [updatedReport] = await db.select().from(reports).where(eq(reports.id, testReportId)).limit(1);
    expect((updatedReport as any).googleDocId).toBe('generated-doc-id-999');
    expect((updatedReport as any).googleDocUrl).toBe('https://docs.google.com/document/d/generated-doc-id-999/edit');
    expect((updatedReport as any).googleSyncStatus).toBe('synced');
  });
});
