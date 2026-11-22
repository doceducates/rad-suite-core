import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  copyToClipboard,
  formatPatientSummary,
  copyReportSection,
  copyFullReport,
} from '@/lib/clipboard';
import {
  formatFullClinicalReport,
  buildFindingsWithTechnique,
  splitTechniqueAndFindings,
} from '@/lib/clinical-format';

describe('Clipboard & Demographics Formatting Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatPatientSummary', () => {
    it('formats a complete patient summary with all clinical fields', () => {
      const summary = formatPatientSummary({
        patientName: 'Jane Doe',
        mrn: 'MRN-12345',
        accessionNumber: 'ACC-2026-99',
        age: 42,
        gender: 'F',
        modality: 'CT',
        studyDescription: 'CT KUB Plain',
        studyDate: '2026-10-05',
        studyTime: '14:30',
        dateOfBirth: '1984-05-12',
        department: 'OPD',
      });

      expect(summary).toContain('Patient: Jane Doe');
      expect(summary).toContain('Age/Gender: 42y / F');
      expect(summary).toContain('MRN: MRN-12345');
      expect(summary).toContain('Accession: ACC-2026-99');
      expect(summary).toContain('Modality: CT');
      expect(summary).toContain('Study: CT KUB Plain');
      expect(summary).toContain('Department: OPD');
      expect(summary).toContain('Date: 2026-10-05 14:30');
      expect(summary).toContain('DOB: 1984-05-12');
    });

    it('gracefully formats partial patient records without undefined values', () => {
      const summary = formatPatientSummary({
        patientName: 'Ahmad Khan',
        accessionNumber: 'ACC-5544',
      });

      expect(summary).toContain('Patient: Ahmad Khan');
      expect(summary).toContain('Accession: ACC-5544');
      expect(summary).not.toContain('undefined');
      expect(summary).not.toContain('null');
      expect(summary).not.toContain('MRN:');
    });
  });

  describe('copyToClipboard', () => {
    it('uses navigator.clipboard.writeText when available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true,
        writable: true,
      });

      const result = await copyToClipboard('Test clipboard text');
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('Test clipboard text');
    });

    it('returns false for empty input without throwing', async () => {
      const result = await copyToClipboard('');
      expect(result).toBe(false);
    });

    it('falls back to execCommand when navigator.clipboard fails', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
        configurable: true,
        writable: true,
      });
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockExecCommand = vi.fn().mockReturnValue(true);

      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue({
          setAttribute: vi.fn(),
          style: {},
          focus: vi.fn(),
          select: vi.fn(),
        }),
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
        execCommand: mockExecCommand,
      };

      const result = await copyToClipboard('Fallback text');
      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('copyReportSection & copyFullReport', () => {
    it('strips rich HTML tags before copying individual section', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true,
        writable: true,
      });

      const html = '<p>Normal <strong>liver</strong> attenuation.</p><p>No focal lesion.</p>';
      const result = await copyReportSection(html, true);

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('Normal liver attenuation.\n\nNo focal lesion.');
    });

    it('formats and copies full clinical report with accession and headers', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true,
        writable: true,
      });

      const result = await copyFullReport({
        patientName: 'Ali Raza',
        patientMrn: 'MRN-8877',
        accessionNumber: 'ACC-998877',
        modality: 'MR',
        studyDescription: 'MRI Brain with Contrast',
        clinicalHistory: 'Headache',
        technique: 'Multiplanar multisequence MRI',
        findings: '<p>No acute infarct or hemorrhage.</p>',
        impression: '<p>1. Normal study.</p>',
      });

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalled();
      const copiedText = mockWriteText.mock.calls[0][0];
      expect(copiedText).toContain('RADIOLOGY CONSULTATION REPORT');
      expect(copiedText).toContain('PATIENT:     Ali Raza');
      expect(copiedText).toContain('ACCESSION:   ACC-998877');
      expect(copiedText).toContain('FINDINGS:\nNo acute infarct or hemorrhage.');
      expect(copiedText).toContain('IMPRESSION:\n1. Normal study.');
    });

    it('prevents duplicate Technique and Findings headers in formatFullClinicalReport', () => {
      const embeddedReport = '<h3><strong>Technique</strong></h3><p>MRI Brain protocol</p><h3><strong>Findings</strong></h3><p>• Brain is unremarkable.</p>';
      const result = formatFullClinicalReport({
        patientName: 'Test Patient',
        modality: 'MRI',
        studyDescription: 'MRI Brain',
        technique: 'MRI Brain protocol',
        findings: embeddedReport,
        impression: 'Normal',
      });

      const techniqueCount = (result.match(/TECHNIQUE:/g) || []).length;
      const findingsCount = (result.match(/FINDINGS:/g) || []).length;
      expect(techniqueCount).toBe(1);
      expect(findingsCount).toBe(1);
      expect(result).not.toContain('FINDINGS:\nTechnique');
    });

    it('buildFindingsWithTechnique produces single bolded Technique and Findings headers', () => {
      // Case 1: Findings already has leading Findings header, technique has no header
      const f1 = '<h3><strong>Findings</strong></h3><p>• Brain is unremarkable.</p>';
      const res1 = buildFindingsWithTechnique(f1, 'MRI Brain with contrast');
      expect((res1.match(/Technique/g) || []).length).toBe(1);
      expect((res1.match(/Findings/g) || []).length).toBe(1);
      expect(res1).toContain('<h3><strong>Technique</strong></h3>');
      expect(res1).toContain('<h3><strong>Findings</strong></h3>');
      expect(res1).not.toContain('<h3>Technique</h3>');
      expect(res1).not.toContain('<h3>Findings</h3>');

      // Case 2: Technique already has HTML header tag from ingestion service
      const f2 = '<h3><strong>Findings</strong></h3><p>• Normal spine.</p>';
      const t2 = '<h3><strong>Technique</strong></h3><p>MRI Lumbar Spine protocol</p>';
      const res2 = buildFindingsWithTechnique(f2, t2);
      expect((res2.match(/Technique/g) || []).length).toBe(1);
      expect((res2.match(/Findings/g) || []).length).toBe(1);
      expect(res2).toContain('<h3><strong>Technique</strong></h3><p>MRI Lumbar Spine protocol</p>');
    });
  });
});
