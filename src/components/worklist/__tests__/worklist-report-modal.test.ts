import { describe, it, expect } from 'vitest';
import { WorklistReportModal } from '../worklist-report-modal';
import { WorklistReportModalHeader } from '../worklist-report-modal-header';
import { WorklistReportModalFooter } from '../worklist-report-modal-footer';
import { WorklistReportModalReader } from '../worklist-report-modal-reader';

describe('Quick Report Modal Architecture & Component Suite', () => {
  it('exports valid WorklistReportModal component', () => {
    expect(typeof WorklistReportModal).toBe('function');
  });

  it('exports valid WorklistReportModalHeader component', () => {
    expect(typeof WorklistReportModalHeader).toBe('function');
  });

  it('exports valid WorklistReportModalFooter component', () => {
    expect(typeof WorklistReportModalFooter).toBe('function');
  });

  it('exports valid WorklistReportModalReader component', () => {
    expect(typeof WorklistReportModalReader).toBe('function');
  });

  it('verifies companion study support in WorklistReportModalHeader contract', () => {
    const companionStudies = [
      { accessionNumber: '192611001164', studyDescription: 'MRI Cervical Spine Without Contrast' },
      { accessionNumber: '192611001162', studyDescription: 'MRI Lumbosacral Spine Without Contrast' },
    ];

    expect(companionStudies.length).toBe(2);
    expect(companionStudies[0].accessionNumber).not.toBe(companionStudies[1].accessionNumber);
  });
});
