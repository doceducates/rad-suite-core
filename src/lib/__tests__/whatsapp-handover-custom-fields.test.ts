import { describe, it, expect } from 'vitest';
import {
  formatWhatsappHandover,
  DEFAULT_HANDOVER_FIELDS,
  SIMPLE_HANDOVER_FIELDS,
} from '../whatsapp-handover';
import type { PacsStudyResult } from '@/types/pacs';

describe('WhatsApp Handover Custom Fields & Presets', () => {
  const sampleCase: PacsStudyResult = {
    accessionNumber: '192610009999',
    patientMrn: 'MRN-777888',
    patientName: 'KHALID HUSSAIN',
    age: 52,
    gender: 'Male',
    modality: 'MRI',
    studyDescription: 'MRI Brain & Cervical Spine',
    studyDate: '20261118',
    numSeries: 6,
    numInstances: 180,
    pacsServerAe: 'ORTHANC',
    studyInstanceUid: '1.2.3.4.9999',
    department: 'Neurosurgery (Ward 5)',
    status: 'draft',
    priority: 'stat',
    criticalFinding: true,
  };

  it('respects Simple Handover preset with concise output', () => {
    const text = formatWhatsappHandover([sampleCase], {
      doctorName: 'Dr. Muhammad Mudassir',
      seniorName: 'Dr. Saadoon',
      ...SIMPLE_HANDOVER_FIELDS,
    });

    // Consultant, Resident, Date present
    expect(text).toContain('👨‍⚕️ *Consultant:* Dr. Saadoon');
    expect(text).toContain('🩺 *Resident:* Dr. Muhammad Mudassir');
    expect(text).toContain('📅 *Date:*');

    // Case line: Name, Accession, Status
    expect(text).toContain('*1. KHALID HUSSAIN*');
    expect(text).toContain('• *Accession:* `192610009999`');
    expect(text).toContain('• *Status:* 📝 Draft');

    // Unselected items omitted
    expect(text).not.toContain('Rad Suite');
    expect(text).not.toContain('52y / Male');
    expect(text).not.toContain('MRN:*');
    expect(text).not.toContain('Modality / Exam:*');
    expect(text).not.toContain('Dept:*');
    expect(text).not.toContain('Priority:*');
    expect(text).not.toContain('Critical Finding Present');
    expect(text).not.toContain('HMIS Portal');
  });

  it('formats custom reporting class date accurately (e.g. 17 Nov 2026)', () => {
    const textIso = formatWhatsappHandover([sampleCase], {
      doctorName: 'Dr. Muhammad Mudassir',
      seniorName: 'Dr. Saadoon',
      classDate: '2026-11-17',
      ...SIMPLE_HANDOVER_FIELDS,
    });

    expect(textIso).toContain('📅 *Class Date:* 17 Nov 2026');
    expect(textIso).toContain('👨‍⚕️ *Consultant:* Dr. Saadoon');
    expect(textIso).toContain('🩺 *Resident:* Dr. Muhammad Mudassir');

    const textCustom = formatWhatsappHandover([sampleCase], {
      classDate: '17-11-2026',
    });
    expect(textCustom).toContain('📅 *Class Date:* 17 Nov 2026');
  });

  it('allows selective field exclusions (e.g. omit MRN and Department)', () => {
    const text = formatWhatsappHandover([sampleCase], {
      ...DEFAULT_HANDOVER_FIELDS,
      includeMrn: false,
      includeDepartment: false,
      includeBranding: false,
    });

    expect(text).not.toContain('Rad Suite Core');
    expect(text).not.toContain('MRN:*');
    expect(text).not.toContain('Dept:*');
    expect(text).toContain('Accession:* `192610009999`');
    expect(text).toContain('52y / Male');
    expect(text).toContain('STAT / Urgent');
  });

  it('handles empty cases list gracefully', () => {
    expect(formatWhatsappHandover([])).toBe('');
  });

  it('handles all fields disabled cleanly without orphaned empty lines', () => {
    const text = formatWhatsappHandover([sampleCase], {
      includeBranding: false,
      includeConsultant: false,
      includeResident: false,
      includeDate: false,
      includeTotalCases: false,
      includeTotalStudies: false,
      includePatientName: false,
      includeAccession: false,
      includeStatus: false,
      includeAgeGender: false,
      includeModalityExam: false,
      includeMrn: false,
      includeDiagnosisHighlights: false,
      includeDepartment: false,
      includePriorityAlerts: false,
      includePortalReminder: false,
    });

    expect(text).toContain('*1. Case 1*');
    expect(text).not.toContain('Consultant:');
    expect(text).not.toContain('Resident:');
    expect(text).not.toContain('Accession:');
  });

  describe('Total Cases and Total Studies options', () => {
    const singleStudyCase: PacsStudyResult = {
      ...sampleCase,
      accessionNumber: 'ACC-SINGLE',
      patientMrn: 'MRN-1',
      patientName: 'SINGLE STUDY PATIENT',
      studies: undefined,
    };

    const multiStudyCase: PacsStudyResult = {
      ...sampleCase,
      accessionNumber: 'ACC-MULTI-1',
      patientMrn: 'MRN-2',
      patientName: 'MULTI STUDY PATIENT',
      isMultiStudy: true,
      studies: [
        { ...sampleCase, accessionNumber: 'ACC-MULTI-1', studyDescription: 'MRI BRAIN' },
        { ...sampleCase, accessionNumber: 'ACC-MULTI-2', studyDescription: 'MRI CERVICAL SPINE' },
        { ...sampleCase, accessionNumber: 'ACC-MULTI-3', studyDescription: 'MRI LUMBAR SPINE' },
      ],
    };

    it('accurately counts 2 cases and 4 studies when both options enabled', () => {
      const text = formatWhatsappHandover([singleStudyCase, multiStudyCase], {
        ...DEFAULT_HANDOVER_FIELDS,
        includeTotalCases: true,
        includeTotalStudies: true,
      });

      expect(text).toContain('📊 *Cases:* 2 | *Studies:* 4');
    });

    it('shows only Cases count when includeTotalStudies is false', () => {
      const text = formatWhatsappHandover([singleStudyCase, multiStudyCase], {
        ...DEFAULT_HANDOVER_FIELDS,
        includeTotalCases: true,
        includeTotalStudies: false,
      });

      expect(text).toContain('📊 *Cases:* 2');
      expect(text).not.toContain('| *Studies:*');
    });

    it('shows only Studies count when includeTotalCases is false', () => {
      const text = formatWhatsappHandover([singleStudyCase, multiStudyCase], {
        ...DEFAULT_HANDOVER_FIELDS,
        includeTotalCases: false,
        includeTotalStudies: true,
      });

      expect(text).toContain('📊 *Studies:* 4');
      expect(text).not.toContain('*Cases:*');
    });

    it('omits summary count line entirely when both options are false', () => {
      const text = formatWhatsappHandover([singleStudyCase, multiStudyCase], {
        ...DEFAULT_HANDOVER_FIELDS,
        includeTotalCases: false,
        includeTotalStudies: false,
      });

      expect(text).not.toContain('📊 *Cases:*');
      expect(text).not.toContain('📊 *Studies:*');
    });

    it('correctly includes pending breakdown with both counts', () => {
      const pendingMultiCase: PacsStudyResult = {
        ...multiStudyCase,
        status: 'pending',
        pendingReason: 'awaiting_prior_images',
        pendingNotes: 'Films needed',
      };

      const text = formatWhatsappHandover([singleStudyCase, pendingMultiCase], {
        ...DEFAULT_HANDOVER_FIELDS,
        includeTotalCases: true,
        includeTotalStudies: true,
      });

      expect(text).toContain('📊 *Cases:* 2 | *Studies:* 4 (1 Active, 1 Pending)');
      expect(text).toContain('⚠️ *Pending Cases Breakdown (1):*');
      expect(text).toContain('MULTI STUDY PATIENT (`ACC-MULTI-1`): Awaiting Prior Comparison Films — "Films needed"');
    });

    it('supports backward compatibility with legacy includeSummaryCount: false', () => {
      const text = formatWhatsappHandover([singleStudyCase, multiStudyCase], {
        ...DEFAULT_HANDOVER_FIELDS,
        includeTotalCases: undefined as any,
        includeTotalStudies: undefined as any,
        includeSummaryCount: false,
      });

      expect(text).not.toContain('📊 *Cases:*');
      expect(text).not.toContain('📊 *Studies:*');
    });
  });
});
