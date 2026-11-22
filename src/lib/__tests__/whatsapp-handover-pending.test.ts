import { describe, it, expect } from 'vitest';
import {
  formatWhatsappHandover,
  formatPendingReason,
  formatClinicalStatus,
  PENDING_REASON_LABELS,
} from '../whatsapp-handover';
import type { PacsStudyResult } from '@/types/pacs';

describe('WhatsApp Handover Pending Cases & Reasons Formatting', () => {
  it('formats predefined clinical pending reason labels accurately', () => {
    expect(formatPendingReason('awaiting_prior_images')).toBe('Awaiting Prior Comparison Films');
    expect(formatPendingReason('missing_history_form')).toBe('Missing Paper History Form / Record');
    expect(formatPendingReason('technologist_ack_pending')).toBe('Technologist Ack Pending / HMIS Issue');
    expect(formatPendingReason('pacs_transfer_pending')).toBe('PACS Imaging Missing / Incomplete');
    expect(formatPendingReason('awaiting_lab_creatinine')).toBe('Awaiting Renal Profile / Creatinine');
    expect(formatPendingReason('motion_artifact_repeat')).toBe('Poor Image Quality / Motion Artifact');
    expect(formatPendingReason('awaiting_clinical_history')).toBe('Awaiting Referring Clinical Indication');
    expect(formatPendingReason('second_opinion_subspecialty')).toBe('Subspecialty / MDT Review');
    expect(formatPendingReason('study_case')).toBe('Study Case / Academic Interest');
    expect(formatPendingReason('other')).toBe('Other Clinical Reason');
    // Custom reason fallback
    expect(formatPendingReason('Specialist biopsy requested')).toBe('Specialist biopsy requested');
  });

  it('formats clinical status badge with pending reason', () => {
    expect(formatClinicalStatus('pending', null, 'awaiting_prior_images')).toBe(
      '⚠️ Pending — Awaiting Prior Comparison Films'
    );
    expect(formatClinicalStatus('pending', null, null)).toBe('⚠️ Pending');
    expect(formatClinicalStatus('final', null, null)).toBe('✅ Verified & Published');
    expect(formatClinicalStatus('draft', null, null)).toBe('📝 Draft');
  });

  it('generates summary header breakdown and per-case status for pending cases', () => {
    const mockCases: PacsStudyResult[] = [
      {
        accessionNumber: '192610008396',
        patientMrn: '312824-0115249',
        patientName: 'Ayesha Usman',
        age: 25,
        gender: 'Female',
        modality: 'MRI',
        studyDescription: 'MRI Lumbosacral Spine Without Contrast',
        status: 'pending',
        pendingReason: 'awaiting_prior_images',
        pendingNotes: 'Films being retrieved from Mayo Hospital',
      } as any,
      {
        accessionNumber: '192610004089',
        patientMrn: '19202654623228',
        patientName: 'Azra BB',
        age: 60,
        gender: 'Female',
        modality: 'MRI',
        studyDescription: 'MRI Lumbosacral Spine Without Contrast',
        status: 'pending',
        pendingReason: 'missing_history_form',
      } as any,
      {
        accessionNumber: '192610004107',
        patientMrn: '1928238958472',
        patientName: 'Bashir Ahmad',
        age: 48,
        gender: 'Male',
        modality: 'MRI',
        studyDescription: 'MRI Lumbosacral & Cervical Spine With Contrast',
        status: 'draft',
      } as any,
    ];

    const text = formatWhatsappHandover(mockCases, {
      doctorName: 'Dr. Jane Doe',
      seniorName: 'Prof. Tariq',
    });

    // 1. Header summary counts
    expect(text).toContain('📊 *Cases:* 3 | *Studies:* 3 (1 Active, 2 Pending)');
    expect(text).toContain('⚠️ *Pending Cases Breakdown (2):*');
    expect(text).toContain('Ayesha Usman (`192610008396`): Awaiting Prior Comparison Films — "Films being retrieved from Mayo Hospital"');
    expect(text).toContain('Azra BB (`192610004089`): Missing Paper History Form / Record');

    // 2. Individual Case 1: Ayesha Usman
    expect(text).toContain('*1. Ayesha Usman (25y / Female)*');
    expect(text).toContain('• *Status:* ⚠️ Pending — Awaiting Prior Comparison Films');
    expect(text).toContain('• 📝 *Pending Notes:* Films being retrieved from Mayo Hospital');

    // 3. Individual Case 2: Azra BB
    expect(text).toContain('*2. Azra BB (60y / Female)*');
    expect(text).toContain('• *Status:* ⚠️ Pending — Missing Paper History Form / Record');

    // 4. Individual Case 3: Bashir Ahmad
    expect(text).toContain('*3. Bashir Ahmad (48y / Male)*');
    expect(text).toContain('• *Status:* 📝 Draft');
  });

  it('correctly handles cases without any pending status', () => {
    const mockCases: PacsStudyResult[] = [
      {
        accessionNumber: '192610004107',
        patientMrn: '1928238958472',
        patientName: 'Bashir Ahmad',
        age: 48,
        gender: 'Male',
        modality: 'MRI',
        studyDescription: 'MRI Brain',
        status: 'preliminary',
      } as any,
    ];

    const text = formatWhatsappHandover(mockCases);
    expect(text).toContain('📊 *Cases:* 1');
    expect(text).not.toContain('Pending Cases Breakdown');
    expect(text).toContain('• *Status:* 🎙️ PGR Preliminary');
  });

  it('handles multi-study order with pending sub-study', () => {
    const mockCase: PacsStudyResult = {
      accessionNumber: 'ACC-MULTI-01',
      patientMrn: 'MRN-MULTI-01',
      patientName: 'Khadija Bibi',
      age: 50,
      gender: 'Female',
      status: 'pending',
      studies: [
        {
          id: 's1',
          accessionNumber: 'ACC-SUB-01',
          modality: 'MRI',
          studyDescription: 'MRI Brain',
          status: 'draft',
        } as any,
        {
          id: 's2',
          accessionNumber: 'ACC-SUB-02',
          modality: 'MRI',
          studyDescription: 'MRI Cervical Spine',
          status: 'pending',
          pendingReason: 'motion_artifact_repeat',
          pendingNotes: 'Severe cough artifact',
        } as any,
      ],
    } as any;

    const text = formatWhatsappHandover([mockCase]);
    expect(text).toContain('⚠️ *Pending Cases Breakdown (1):*');
    expect(text).toContain('Khadija Bibi (`ACC-MULTI-01`): Poor Image Quality / Motion Artifact — "Severe cough artifact"');
    expect(text).toContain('2. `ACC-SUB-02` — [MRI] MRI Cervical Spine • ⚠️ Pending — Poor Image Quality / Motion Artifact');
    expect(text).toContain('📝 *Pending Notes:* Severe cough artifact');
  });
});
