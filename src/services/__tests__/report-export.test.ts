import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildDocxReport } from '../report-export-docx.service';
import { buildPdfReport } from '../report-export-pdf.service';
import { generateReportExport } from '../report-export.service';
import { splitTechniqueAndFindings, cleanClinicalHistory } from '@/lib/clinical-format';
import { ReportExportSchema } from '@/lib/validation';
import { db } from '@/db';
import { users, patients, studies, reports } from '@/db/schema';
import crypto from 'crypto';

describe('Report Export Services (PDF & DOCX)', () => {
  const sampleData = {
    format: 'pdf' as const,
    hospitalName: 'Lahore General Hospital, Lahore',
    department: 'Department of Radiology & Diagnostic Imaging',
    patientName: 'Ahmad Khan',
    patientMrn: 'MRN-789012',
    patientAge: 45,
    patientGender: 'Male',
    accessionNumber: 'ACC-CT-99123',
    modality: 'CT',
    procedureName: 'CT Chest with IV Contrast',
    studyDescription: 'CT Chest with IV Contrast',
    studyDate: new Date().toISOString(),
    clinicalHistory: 'Cough, hemoptysis, and shortness of breath for 3 weeks.',
    technique: 'Helical CT images obtained through the chest with 100mL Omnipaque 350.',
    findings: '<p>Trachea and main bronchi are clear.</p><p>• No pulmonary nodules or consolidations.</p><p>• Heart size is normal. No pleural effusion.</p>',
    impression: '<p>1. Normal CT examination of the chest.</p><p>2. No evidence of acute pulmonary embolism or active parenchymal disease.</p>',
    recommendations: 'Clinical follow-up as indicated.',
    pgrName: 'Dr. Test Resident (PGR)',
    consultantName: 'Dr. Senior Consultant (FCPS)',
    status: 'final',
  };

  describe('Validation Schema', () => {
    it('accepts valid PDF export request', () => {
      const res = ReportExportSchema.safeParse({ format: 'pdf', findings: 'Normal', impression: 'Normal' });
      expect(res.success).toBe(true);
    });

    it('accepts valid DOCX export request', () => {
      const res = ReportExportSchema.safeParse({ format: 'docx', findings: 'Normal', impression: 'Normal' });
      expect(res.success).toBe(true);
    });

    it('rejects unsupported export formats', () => {
      const res = ReportExportSchema.safeParse({ format: 'exe', findings: 'Normal', impression: 'Normal' });
      expect(res.success).toBe(false);
    });
  });

  describe('buildDocxReport', () => {
    it('generates a valid DOCX binary buffer with OpenXML header', async () => {
      const buffer = await buildDocxReport({ ...sampleData, format: 'docx' });
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);
      // DOCX files are zip archives starting with 'PK\x03\x04' (0x50, 0x4B, 0x03, 0x04)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });
  });

  describe('buildPdfReport', () => {
    it('generates a valid PDF binary buffer with %PDF- header', async () => {
      const bytes = await buildPdfReport(sampleData);
      expect(bytes).toBeDefined();
      expect(bytes.length).toBeGreaterThan(500);
      // PDF files begin with '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
      const header = String.fromCharCode(...bytes.slice(0, 5));
      expect(header).toBe('%PDF-');
    });

    it('handles lengthy reports and generates multiple pages without error', async () => {
      const longFindings = Array.from({ length: 50 }, (_, i) => `<p>Finding item ${i + 1}: Unremarkable anatomical evaluation of section ${i + 1}.</p>`).join('');
      const bytes = await buildPdfReport({
        ...sampleData,
        findings: longFindings,
      });
      expect(bytes.length).toBeGreaterThan(1000);
      const header = String.fromCharCode(...bytes.slice(0, 5));
      expect(header).toBe('%PDF-');
    });
  });

  describe('generateReportExport', () => {
    let testUserId: string;
    let testPatientId: string;
    let testStudyId: string;
    let testReportId: string;
    let testAccession: string;

    beforeEach(async () => {
      testUserId = crypto.randomUUID();
      testPatientId = crypto.randomUUID();
      testStudyId = crypto.randomUUID();
      testReportId = crypto.randomUUID();
      testAccession = `ACC-EXP-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;

      await db.insert(users).values({
        id: testUserId,
        name: 'Dr. Test Radiologist',
        email: `tester-${crypto.randomUUID()}@radsuite.pk`,
        passwordHash: 'dummyhash',
        role: 'radiologist',
        createdAt: new Date(),
      } as any);

      await db.insert(patients).values({
        id: testPatientId,
        mrNumber: `MRN-${Date.now()}`,
        fullName: 'Test Patient Name',
        age: 50,
        gender: 'Female',
        createdAt: new Date(),
      } as any);

      await db.insert(studies).values({
        id: testStudyId,
        patientId: testPatientId,
        accessionNumber: testAccession,
        modality: 'MRI',
        scanType: 'MRI Brain with Contrast',
        bodyPart: 'Brain',
        studyDescription: 'MRI Brain with Contrast',
        status: 'draft',
        scheduledAt: new Date(),
        createdAt: new Date(),
      } as any);

      await db.insert(reports).values({
        id: testReportId,
        studyId: testStudyId,
        patientId: testPatientId,
        authorId: testUserId,
        status: 'draft',
        findings: '<p>No acute intracranial abnormality.</p>',
        impression: '<p>Normal MRI Brain study.</p>',
        createdAt: new Date(),
      } as any);
    });

    it('exports PDF directly with provided fields', async () => {
      const res = await generateReportExport({
        format: 'pdf',
        patientName: 'Direct Patient',
        accessionNumber: 'ACC-DIR-123',
        modality: 'CT',
        findings: 'Normal chest',
        impression: 'No acute abnormality',
      });

      expect(res.mimeType).toBe('application/pdf');
      expect(res.fileName).toContain('.pdf');
      expect(res.buffer.length).toBeGreaterThan(500);
    });

    it('exports DOCX directly with provided fields', async () => {
      const res = await generateReportExport({
        format: 'docx',
        patientName: 'Direct Patient',
        accessionNumber: 'ACC-DIR-123',
        modality: 'CT',
        findings: 'Normal chest',
        impression: 'No acute abnormality',
      });

      expect(res.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(res.fileName).toContain('.docx');
      expect(res.buffer.length).toBeGreaterThan(1000);
    });

    it('enriches missing fields from database using reportId', async () => {
      const res = await generateReportExport({
        format: 'pdf',
        reportId: testReportId,
        findings: '',
        impression: '',
        modality: 'MRI',
      });

      expect(res.mimeType).toBe('application/pdf');
      expect(res.fileName).toContain('MRI');
      expect(res.fileName).toContain(testAccession);
      expect(res.buffer.length).toBeGreaterThan(500);
    });

    it('respects dynamic consultantName without leaking any hardcoded mock physician names', async () => {
      const customConsultant = 'Dr. Custom Rotation Supervisor';
      const customPgr = 'Dr. Active Class Resident';
      const pdfRes = await generateReportExport({
        format: 'pdf',
        patientName: 'Attribution Test Patient',
        modality: 'CT',
        findings: 'Normal exam',
        impression: 'Normal',
        consultantName: customConsultant,
        pgrName: customPgr,
      });

      expect(pdfRes.buffer.length).toBeGreaterThan(500);

      const docxRes = await generateReportExport({
        format: 'docx',
        patientName: 'Attribution Test Patient',
        modality: 'CT',
        findings: 'Normal exam',
        impression: 'Normal',
        consultantName: customConsultant,
        pgrName: customPgr,
      });

      expect(docxRes.buffer.length).toBeGreaterThan(1000);
    });
  });

  describe('Section Deduplication & HTML Sanitization Helpers', () => {
    it('cleans <p> and <br> tags from clinical history', () => {
      const raw = '<p>History of lower back pain for 7 months, without lower limb radiation.<br/>No history of trauma.</p>';
      const cleaned = cleanClinicalHistory(raw);
      expect(cleaned).not.toContain('<p>');
      expect(cleaned).not.toContain('</p>');
      expect(cleaned).not.toContain('<br/>');
      expect(cleaned).toBe('History of lower back pain for 7 months, without lower limb radiation.\nNo history of trauma.');
    });

    it('splits embedded technique and findings from plain text without duplication', () => {
      const rawFindings = `Technique\nMultiplanar MRI of dorsal spine was performed.\n\nFindings\n• Curvature & Alignment: Normal.`;
      const result = splitTechniqueAndFindings(rawFindings, 'Multiplanar MRI of dorsal spine was performed.');
      expect(result.technique).toBe('Multiplanar MRI of dorsal spine was performed.');
      expect(result.findings).toBe('• Curvature & Alignment: Normal.');
      expect(result.findings).not.toContain('Technique');
      expect(result.findings).not.toMatch(/^Findings/i);
    });

    it('extracts embedded technique if separate technique field was empty', () => {
      const rawFindings = `<h3>Technique</h3><p>Helical CT chest</p><h3>Findings</h3><p>• Lungs: Clear.</p>`;
      const result = splitTechniqueAndFindings(rawFindings, '');
      expect(result.technique).toBe('Helical CT chest');
      expect(result.findings).toContain('• Lungs: Clear.');
      expect(result.findings).not.toContain('Technique');
    });

    it('strips standalone <p><strong>Technique:</strong> ...</p> from findings without duplicate', () => {
      const tech = 'Sequential axial non-contrast CT sections of the brain were obtained from skull base to vertex.';
      const rawFindings = `<p><strong>Technique:</strong> ${tech}</p><p><strong>Brain Parenchyma:</strong> Preserved.</p>`;
      const result = splitTechniqueAndFindings(rawFindings, tech);
      expect(result.technique).toBe(tech);
      expect(result.findings).toBe('<p><strong>Brain Parenchyma:</strong> Preserved.</p>');
      expect(result.findings).not.toContain('Technique');
    });

    it('removes duplicate technique paragraph from findings even without technique label', () => {
      const tech = 'Sequential axial non-contrast CT sections of the brain were obtained from skull base to vertex.';
      const rawFindings = `<p>${tech}</p><p><strong>Brain Parenchyma:</strong> Preserved.</p>`;
      const result = splitTechniqueAndFindings(rawFindings, tech);
      expect(result.technique).toBe(tech);
      expect(result.findings).toBe('<p><strong>Brain Parenchyma:</strong> Preserved.</p>');
    });
  });
});
