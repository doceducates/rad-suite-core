import { describe, it, expect } from 'vitest';
import {
  formatWhatsappHandover,
  getWhatsappShareUrl,
  normalizeWhatsappPhone,
  SIMPLE_HANDOVER_FIELDS,
  DEFAULT_HANDOVER_FIELDS,
} from '../whatsapp-handover';
import type { PacsStudyResult } from '@/types/pacs';

describe('WhatsApp Clinical Handover Helper', () => {
  const mockCases: PacsStudyResult[] = [
    {
      accessionNumber: '192610000850',
      patientMrn: '3829104',
      patientName: 'BALQUIS AKHTAR',
      age: 58,
      gender: 'Female',
      modality: 'CT',
      studyDescription: 'CT Brain Plain',
      studyDate: '20261003',
      numSeries: 1,
      numInstances: 45,
      pacsServerAe: 'ORTHANC',
      studyInstanceUid: '1.2.3.4.5',
      department: 'Emergency (ER)',
      status: 'awaiting_report',
      priority: 'stat',
      criticalFinding: true,
      source: 'hmis',
    },
    {
      accessionNumber: '192610000851',
      patientMrn: '3829105',
      patientName: 'MUHAMMAD AHMAD',
      age: 42,
      gender: 'Male',
      modality: 'MRI',
      studyDescription: 'MRI Lumbar Spine',
      studyDate: '20261003',
      numSeries: 4,
      numInstances: 120,
      pacsServerAe: 'ORTHANC',
      studyInstanceUid: '1.2.3.4.6',
      department: 'OPD',
      status: 'draft',
      source: 'hmis',
    },
  ];

  it('normalizes Pakistani phone numbers properly', () => {
    expect(normalizeWhatsappPhone('03001234567')).toBe('923001234567');
    expect(normalizeWhatsappPhone('+923001234567')).toBe('923001234567');
    expect(normalizeWhatsappPhone('923001234567')).toBe('923001234567');
    expect(normalizeWhatsappPhone('0300-1234567')).toBe('923001234567');
  });

  it('formats handover message with patient MRNs, accessions, and details', () => {
    const text = formatWhatsappHandover(mockCases, {
      doctorName: 'Dr. Jane Doe',
      seniorName: 'Prof. Tariq',
      hospitalName: 'DHQ Teaching Hospital Gujranwala',
      customNote: 'Please verify case #1 on priority due to acute stroke symptoms.',
    });

    expect(text).toContain('Rad Suite Core — Clinical Case Review / Handover');
    expect(text).toContain('Prof. Tariq');
    expect(text).toContain('Dr. Jane Doe');
    expect(text).toContain('DHQ Teaching Hospital Gujranwala');
    expect(text).toContain('BALQUIS AKHTAR');
    expect(text).toContain('58y / Female');
    expect(text).toContain('MRN:* `3829104`');
    expect(text).toContain('Accession:* `192610000850`');
    expect(text).toContain('STAT / Urgent');
    expect(text).toContain('Critical Finding Present');
    expect(text).toContain('MUHAMMAD AHMAD');
    expect(text).toContain('Please verify case #1 on priority');
    expect(text).toContain('Please review and verify on HMIS Portal.');
  });

  it('formats minimal simple handover layout correctly', () => {
    const text = formatWhatsappHandover(mockCases, {
      doctorName: 'Dr. Muhammad Mudassir',
      seniorName: 'Dr. Saadoon',
      ...SIMPLE_HANDOVER_FIELDS,
    });

    // Contains simple header info: Consultant, Resident, Date
    expect(text).toContain('👨‍⚕️ *Consultant:* Dr. Saadoon');
    expect(text).toContain('🩺 *Resident:* Dr. Muhammad Mudassir');
    expect(text).toContain('📅 *Date:*');

    // Branding and summary counts are omitted in simple mode
    expect(text).not.toContain('Rad Suite');
    expect(text).not.toContain('📊 *Cases:*');

    // Case list includes patient name, accession, and status only
    expect(text).toContain('*1. BALQUIS AKHTAR*');
    expect(text).toContain('• *Accession:* `192610000850`');
    expect(text).toContain('• *Status:* ⏳ Awaiting Report');

    expect(text).toContain('*2. MUHAMMAD AHMAD*');
    expect(text).toContain('• *Accession:* `192610000851`');
    expect(text).toContain('• *Status:* 📝 Draft');

    // Omitted in simple mode
    expect(text).not.toContain('58y / Female');
    expect(text).not.toContain('MRN:*');
    expect(text).not.toContain('Modality / Exam:*');
    expect(text).not.toContain('Dept:*');
    expect(text).not.toContain('STAT / Urgent');
    expect(text).not.toContain('Please review and verify on HMIS Portal.');
  });

  it('supports selectively toggling branding off', () => {
    const textWithoutBranding = formatWhatsappHandover(mockCases, {
      doctorName: 'Dr. Mudassir',
      includeBranding: false,
    });
    expect(textWithoutBranding).not.toContain('Rad Suite');
    expect(textWithoutBranding).toContain('Dr. Mudassir');

    const textWithBranding = formatWhatsappHandover(mockCases, {
      doctorName: 'Dr. Mudassir',
      includeBranding: true,
    });
    expect(textWithBranding).toContain('Rad Suite Core — Clinical Case Review / Handover');
  });

  it('generates universal and direct-recipient WhatsApp URLs', () => {
    const text = 'Test clinical handover';
    const genericUrl = getWhatsappShareUrl(text);
    expect(genericUrl).toBe('https://api.whatsapp.com/send?text=Test%20clinical%20handover');

    const directUrl = getWhatsappShareUrl(text, '03001234567');
    expect(directUrl).toBe('https://api.whatsapp.com/send?phone=923001234567&text=Test%20clinical%20handover');
  });
});
