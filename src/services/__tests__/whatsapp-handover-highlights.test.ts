import { describe, it, expect } from 'vitest';
import { formatWhatsappHandover, getWhatsappShareUrl } from '@/lib/whatsapp-handover';
import type { PacsStudyResult } from '@/types/pacs';

describe('WhatsApp Clinical Handover Highlights', () => {
  const sampleCases: PacsStudyResult[] = [
    {
      accessionNumber: '192610003635',
      patientName: 'Muhammad Ali',
      patientMrn: '19202519413617',
      age: 48,
      gender: 'Male',
      modality: 'MRI',
      studyDescription: 'MRI Lumbar Spine',
      studyDate: '2026-10-17',
      numSeries: 5,
      numInstances: 140,
      pacsServerAe: 'LOCAL_ARCHIVE',
      studyInstanceUid: '1.2.840.113619.2.192610003635',
      status: 'draft',
      diagnosisHighlight: 'L4-L5 left paracentral disc protrusion compressing exiting L4 root.',
    },
    {
      accessionNumber: '192610004500',
      patientName: 'Fatima Bibi',
      patientMrn: '19202519413999',
      age: 32,
      gender: 'Female',
      modality: 'CT',
      studyDescription: 'CT Brain Plain',
      studyDate: '2026-10-17',
      numSeries: 2,
      numInstances: 80,
      pacsServerAe: 'LOCAL_ARCHIVE',
      studyInstanceUid: '1.2.840.113619.2.192610004500',
      status: 'reported',
      impression: '<ol><li>Acute right MCA territorial ischemic infarct with mass effect.</li><li>No hemorrhage.</li></ol>',
    },
    {
      accessionNumber: '192610005001',
      patientName: 'Zahid Khan',
      patientMrn: '19202519414001',
      age: 25,
      gender: 'Male',
      modality: 'XR',
      studyDescription: 'Chest PA View',
      studyDate: '2026-10-17',
      numSeries: 1,
      numInstances: 1,
      pacsServerAe: 'LOCAL_ARCHIVE',
      studyInstanceUid: '1.2.840.113619.2.192610005001',
      status: 'scheduled',
    },
  ];

  it('formats handover message without highlights when option is false or omitted', () => {
    const textDefault = formatWhatsappHandover(sampleCases);
    expect(textDefault).not.toContain('Key Diagnosis');

    const textDisabled = formatWhatsappHandover(sampleCases, { includeDiagnosisHighlights: false });
    expect(textDisabled).not.toContain('Key Diagnosis');
  });

  it('includes Key Diagnosis highlight when includeDiagnosisHighlights is true', () => {
    const text = formatWhatsappHandover(sampleCases, {
      includeDiagnosisHighlights: true,
      doctorName: 'Dr. Tariq',
      seniorName: 'Prof. Usman',
    });

    expect(text).toContain('• 🎯 *Key Diagnosis:* L4-L5 left paracentral disc protrusion compressing exiting L4 root.');
    expect(text).toContain('• 🎯 *Key Diagnosis:* Acute right MCA territorial ischemic infarct');
    // Scheduled case with no impression or highlight should not display Key Diagnosis line
    const zahidSection = text.split('*3. Zahid Khan')[1];
    expect(zahidSection).not.toContain('Key Diagnosis');
  });

  it('generates universal whatsapp share url with encoded text', () => {
    const text = formatWhatsappHandover(sampleCases, { includeDiagnosisHighlights: true });
    const url = getWhatsappShareUrl(text, '03001234567');

    expect(url).toContain('https://api.whatsapp.com/send?phone=923001234567');
    expect(url).toContain(encodeURIComponent('🎯 *Key Diagnosis:*'));
  });
});
