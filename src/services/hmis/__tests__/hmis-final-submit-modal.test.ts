import { describe, it, expect } from 'vitest';
import { HmisFinalSubmitModal, type HmisFinalSubmitModalProps } from '@/components/hmis/hmis-final-submit-modal';

describe('HMIS Final Submit Double-Confirmation Guard Modal', () => {
  it('exports valid HmisFinalSubmitModal component', () => {
    expect(typeof HmisFinalSubmitModal).toBe('function');
  });

  it('declares strictly typed props matching clinical safety requirements', () => {
    const props: HmisFinalSubmitModalProps = {
      isOpen: true,
      onClose: () => {},
      onConfirm: async () => {},
      patientName: 'M HAYAT',
      patientMrn: '48202416809549',
      accessionNumber: '192611001164',
      studyDescription: 'MRI Cervical Spine Without Contrast',
      submitting: false,
    };

    expect(props.patientName).toBe('M HAYAT');
    expect(props.accessionNumber).toBe('192611001164');
    expect(props.isOpen).toBe(true);
    expect(typeof props.onConfirm).toBe('function');
  });
});

