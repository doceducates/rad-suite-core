import { describe, it, expect } from 'vitest';
import { heuristicSplitMultiPatient, generateBatchHtmlReport, BatchReportItem } from '../batch-reporting.service';

describe('Batch Reporting Service', () => {
  it('correctly splits continuous multi-patient dictation into distinct report items', () => {
    const continuousText = `
Patient 1:
CT Brain plain for 45-year-old male with head trauma.
No acute hemorrhage or fracture seen. Ventricles are normal.
Impression: Normal CT brain.

Next patient:
MRI Lumbar Spine for 32-year-old female with back pain.
L4-L5 posterior disc protrusion indenting thecal sac.
Impression: L4-L5 disc protrusion.

Patient 3:
Ultrasound abdomen for 50-year-old female with RUQ pain.
Gallbladder contains multiple calculi. Normal liver.
Impression: Cholelithiasis without acute cholecystitis.
`;

    const reports = heuristicSplitMultiPatient(continuousText, 'CT');
    expect(reports.length).toBe(3);
    expect(reports[0].patientName).toBe('Patient 1');
    expect(reports[0].findings).toContain('No acute hemorrhage');
    expect(reports[0].impression).toContain('Normal CT brain');

    expect(reports[1].patientName).toBe('Patient 2');
    expect(reports[1].findings).toContain('L4-L5 posterior disc protrusion');

    expect(reports[2].patientName).toBe('Patient 3');
    expect(reports[2].findings).toContain('Gallbladder contains multiple calculi');
  });

  it('generates well-formatted HTML document for printing multiple reports', () => {
    const dummyReports: BatchReportItem[] = [
      {
        id: 'b-1',
        patientName: 'Zainab Bibi',
        mrn: 'MRN-90210',
        studyName: 'CT Chest (CECT)',
        modality: 'CT',
        technique: 'Contrast enhanced helical CT',
        findings: 'Lungs are clear bilaterally.',
        impression: '1. Normal study.',
        status: 'structured',
      },
    ];

    const html = generateBatchHtmlReport(dummyReports);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Zainab Bibi');
    expect(html).toContain('CT Chest (CECT)');
    expect(html).toContain('Lungs are clear bilaterally.');
  });
});
