import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import {
  htmlToClinicalText,
  clinicalTextToHtml,
  formatFullClinicalReport,
  stripAttributionFromText,
  normalizeImpressionSignatureHtml,
} from '@/lib/clinical-format';
import { normalizeImpressionList } from '../clinical-dictation-formatter';
import { saveReport, getReportByStudyOrAccession } from '../report.service';

vi.mock('../audit.service', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('Clinical Formatting & Persistence Suite', () => {
  const mockUser = {
    id: 'user-format-1',
    name: 'Dr. Clinical Radiologist',
    role: 'consultant',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('htmlToClinicalText & clinicalTextToHtml Round-trip Formatting', () => {
    it('preserves paragraph line breaks without collapsing sentences into one line', () => {
      const richHtml = '<p>Normal lung parenchyma bilaterally.</p><p>No pneumothorax or pleural effusion.</p>';
      const plainText = htmlToClinicalText(richHtml);

      expect(plainText).toBe('Normal lung parenchyma bilaterally.\n\nNo pneumothorax or pleural effusion.');
    });

    it('formats bullet lists into bullet characters with separate lines', () => {
      const listHtml = '<p>Key observations:</p><ul><li>4mm calculus in gallbladder neck</li><li>Mild wall thickening</li></ul>';
      const plainText = htmlToClinicalText(listHtml);

      expect(plainText).toContain('• 4mm calculus in gallbladder neck');
      expect(plainText).toContain('• Mild wall thickening');
      expect(plainText.split('\n').length).toBeGreaterThanOrEqual(3);
    });

    it('decodes HTML entities and does not leave &nbsp; or raw entity codes', () => {
      const entityHtml = '<p>C5-C6&nbsp;disc bulge&amp;mild neural foraminal narrowing &gt; 2mm.</p>';
      const plainText = htmlToClinicalText(entityHtml);

      expect(plainText).toBe('C5-C6 disc bulge&mild neural foraminal narrowing > 2mm.');
      expect(plainText).not.toContain('&nbsp;');
      expect(plainText).not.toContain('&amp;');
      expect(plainText).not.toContain('&gt;');
    });

    it('converts textarea multiline plain text to clean semantic HTML paragraphs', () => {
      const plainInput = 'First paragraph of findings.\n\nSecond paragraph of findings with conclusion.';
      const htmlOutput = clinicalTextToHtml(plainInput);

      expect(htmlOutput).toBe('<p>First paragraph of findings.</p><p>Second paragraph of findings with conclusion.</p>');
    });

    it('performs lossless round-trip from Plain Text -> HTML -> Plain Text', () => {
      const originalText = '1. Mild hepatomegaly without focal mass.\n\n2. Normal gallbladder, pancreas, and spleen.';
      const asHtml = clinicalTextToHtml(originalText);
      const restoredText = htmlToClinicalText(asHtml);

      expect(restoredText).toBe(originalText);
    });

    it('formats full clinical report for 1-click clipboard copying', () => {
      const formatted = formatFullClinicalReport({
        patientName: 'John Doe',
        patientMrn: 'MRN-998877',
        modality: 'CT',
        studyDescription: 'CT Chest with Contrast',
        studyDate: '2026-09-29T10:00:00Z',
        clinicalHistory: 'Shortness of breath for 3 days',
        technique: 'Contrast-enhanced helical axial acquisition',
        findings: '<p>Lungs are clear.</p><p>No mediastinal lymphadenopathy.</p>',
        impression: '<p>1. No evidence of pulmonary embolism.</p>',
        authorName: 'Dr. Resident',
        authorRole: 'pgr',
        consultantName: 'Dr. Consultant',
      });

      expect(formatted).toContain('RADIOLOGY CONSULTATION REPORT');
      expect(formatted).toContain('PATIENT:     John Doe');
      expect(formatted).toContain('MRN:         MRN-998877');
      expect(formatted).toContain('CLINICAL HISTORY:\nShortness of breath for 3 days');
      expect(formatted).toContain('Lungs are clear.\n\nNo mediastinal lymphadenopathy.');
      expect(formatted).toContain('1. No evidence of pulmonary embolism.');
      expect(formatted).toContain('Reporting Radiologist: Dr. Resident (PGR)');
      expect(formatted).toContain('Verified / Signed by:  Dr. Consultant');
    });
  });

  describe('Database Persistence of Clinical History & Formatting Sync', () => {
    it('persists clinicalHistory, technique, findings, and impression in saveReport', async () => {
      const existingStudy = {
        id: 'study-pers-1',
        patientId: 'patient-pers-1',
        accessionNumber: 'ACC-PERS-1',
        status: 'scheduled',
        priority: 'routine',
        clinicalHistory: 'Old history',
      };

      const existingReport = {
        id: 'report-pers-1',
        studyId: 'study-pers-1',
        patientId: 'patient-pers-1',
        authorId: mockUser.id,
        status: 'draft',
        findings: '<p>Old findings</p>',
        impression: '<p>Old impression</p>',
        clinicalHistory: 'Old history',
      };

      const capturedReportUpdate: any = {};
      const capturedStudyUpdate: any = {};

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([existingStudy]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([existingReport]),
            }),
          }),
        });

      const mockUpdate = vi.fn().mockImplementation((table: any) => ({
        set: vi.fn().mockImplementation((values: any) => {
          if (values.findings !== undefined) {
            Object.assign(capturedReportUpdate, values);
          } else {
            Object.assign(capturedStudyUpdate, values);
          }
          return {
            where: vi.fn().mockResolvedValue({}),
          };
        }),
      }));

      vi.spyOn(db, 'select').mockImplementation(mockSelect as any);
      vi.spyOn(db, 'update').mockImplementation(mockUpdate as any);

      const typedHistory = 'Severe right lower quadrant pain and fever';
      const typedFindingsHtml = '<p>Normal appendix not visualized.</p><p>No free fluid in pelvis.</p>';
      const typedImpressionHtml = '<p>1. Low probability of acute appendicitis.</p>';

      const result = await saveReport(
        {
          reportId: 'report-pers-1',
          studyId: 'study-pers-1',
          accessionNumber: 'ACC-PERS-1',
          clinicalHistory: typedHistory,
          technique: 'Spiral CT of abdomen and pelvis with IV contrast',
          findings: typedFindingsHtml,
          impression: typedImpressionHtml,
          status: 'preliminary',
        },
        mockUser
      );

      expect(result.success).toBe(true);
      // Verify clinicalHistory was updated on report
      expect(capturedReportUpdate.clinicalHistory).toBe(typedHistory);
      expect(capturedReportUpdate.findings).toBe(typedFindingsHtml);
      expect(capturedReportUpdate.impression).toBe(typedImpressionHtml);
      // Verify clinicalHistory was also synced to parent study
      expect(capturedStudyUpdate.clinicalHistory).toBe(typedHistory);
    });

    it('retrieves study and report with clinicalHistory correctly resolved', async () => {
      const mockStudy = {
        id: 'study-ret-1',
        patientId: 'patient-ret-1',
        accessionNumber: 'ACC-RET-1',
        clinicalHistory: 'Head injury following road traffic accident',
      };
      const mockPatient = {
        id: 'patient-ret-1',
        fullName: 'Jane Smith',
        mrNumber: 'MRN-777666',
      };
      const mockReport = {
        id: 'report-ret-1',
        studyId: 'study-ret-1',
        findings: '<p>Cranial vault intact.</p><p>Brain parenchyma unremarkable.</p>',
        impression: '<p>1. No acute intracranial hemorrhage.</p>',
        clinicalHistory: null, // Test fallback to study.clinicalHistory
      };

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockStudy]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockPatient]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce([mockReport]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce([{ version: 1 }]),
              }),
            }),
          }),
        });

      vi.spyOn(db, 'select').mockImplementation(mockSelect as any);

      const data = await getReportByStudyOrAccession('ACC-RET-1');
      expect(data).not.toBeNull();
      expect(data.study.accessionNumber).toBe('ACC-RET-1');
      expect(data.report.clinicalHistory).toBe('Head injury following road traffic accident');

      // Verify that when loaded into worklist modal, findings and impression format cleanly
      const displayFindings = htmlToClinicalText(data.report.findings);
      const displayImpression = htmlToClinicalText(data.report.impression);

      expect(displayFindings).toBe('Cranial vault intact.\n\nBrain parenchyma unremarkable.');
      expect(displayImpression).toBe('1. No acute intracranial hemorrhage.');
    });
  });

  describe('Signature Sanitization & Deduplication Suite', () => {
    it('completely strips corrupted double signatures and orphaned tags', () => {
      const corrupted = '<ul><li><p>Straightening of lumbar lordosis.</p></li></ul><p><strong>Reported by: </strong><em>Dr. Mudassir (PGR)</em></p> </strong><em>Dr. Muhammad Mudassir (PGR)</em></p>';
      const cleaned = stripAttributionFromText(corrupted);

      expect(cleaned).toBe('<ul><li><p>Straightening of lumbar lordosis.</p></li></ul>');
      expect(cleaned).not.toContain('Mudassir');
      expect(cleaned).not.toContain('</strong><em>');
    });

    it('normalizes impression signature idempotently to the HMIS profile doctor name', () => {
      const initial = '<ul><li><p>Straightening of lumbar lordosis.</p></li></ul><p><strong>Reported by: </strong><em>Dr. Muhammad Mudassir (PGR)</em></p>';
      const normalized = normalizeImpressionSignatureHtml(initial, 'Dr. Mudassir (PGR)');

      expect(normalized).toBe('<ul><li><p>Straightening of lumbar lordosis.</p></li></ul><p><br></p><p><strong>Reported by: </strong><em>Dr. Mudassir (PGR)</em></p>');
      expect(normalized).not.toContain('Muhammad');

      // Idempotency: Running again produces the exact same output
      const runAgain = normalizeImpressionSignatureHtml(normalized, 'Dr. Mudassir (PGR)');
      expect(runAgain).toBe(normalized);
    });

    it('prevents normalizeImpressionList from numbering signatures as findings', () => {
      const input = '1. Straightening of lordosis.\n2. L4-L5 disc bulge.\nReported by: Dr. Mudassir (PGR)';
      const structured = normalizeImpressionList(input);

      expect(structured).toContain('1. Straightening of lordosis.');
      expect(structured).toContain('2. L4-L5 disc bulge.');
      expect(structured).not.toContain('Reported by');
      expect(structured).not.toContain('3.');
    });

    it('formatFullClinicalReport strips embedded signature from impression when authorName is provided', () => {
      const full = formatFullClinicalReport({
        patientName: 'Test Patient',
        modality: 'MRI',
        studyDescription: 'MRI Spine',
        findings: '<p>Intact alignment.</p>',
        impression: '<p>1. Normal spine.</p><p><br></p><p><strong>Reported by: </strong><em>Dr. Mudassir (PGR)</em></p>',
        authorName: 'Dr. Mudassir (PGR)',
        authorRole: 'pgr',
      });

      // Signature should only be present once under signers block, not duplicated in impression text
      const matches = full.match(/Mudassir/g) || [];
      expect(matches.length).toBe(1);
      expect(full).toContain('Reporting Radiologist: Dr. Mudassir (PGR) (PGR)');
    });
  });
});
