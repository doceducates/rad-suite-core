import { describe, it, expect } from 'vitest';
import { detectCriticalFindings, formatUrgentErHandover } from '../critical-findings';

describe('Acute Critical Findings Radar & Emergency ER Handover', () => {
  it('detects subdural hematoma with midline shift as critical neuro findings', () => {
    const reportText = `
      <p>There is an acute crescentic subdural hematoma along the right frontoparietal convexity measuring 14mm in depth.</p>
      <p>Associated midline shift of approximately 8mm to the left is noted with subfalcine herniation.</p>
    `;

    const matches = detectCriticalFindings(reportText);
    expect(matches.length).toBe(2);

    const findings = matches.map((m) => m.finding);
    expect(findings).toContain('Intracranial Hemorrhage');
    expect(findings).toContain('Midline Shift / Brain Herniation');
  });

  it('correctly suppresses false positive triggers when explicit negation exists', () => {
    const normalReport = `
      <p>No acute intracranial hemorrhage or midline shift.</p>
      <p>Lungs show no evidence of pneumothorax or pulmonary embolism.</p>
      <p>No pneumoperitoneum identified.</p>
    `;

    const matches = detectCriticalFindings(normalReport);
    expect(matches.length).toBe(0);
  });

  it('detects acute tension pneumothorax in chest trauma', () => {
    const report = 'Large tension pneumothorax on the left with mediastinal shift to the right.';
    const matches = detectCriticalFindings(report);
    expect(matches.length).toBe(1);
    expect(matches[0].category).toBe('Chest');
    expect(matches[0].finding).toBe('Tension Pneumothorax');
    expect(matches[0].urgentAction).toContain('needle decompression');
  });

  it('formats clean, high-yield urgent WhatsApp ER message', () => {
    const criticalMatches = detectCriticalFindings('Acute extradural hematoma with 6mm midline shift.');
    const whatsapp = formatUrgentErHandover({
      patientName: 'Ahmad Ali',
      mrn: '192609005769',
      modality: 'CT',
      criticalMatches,
      doctorName: 'Dr. Jane Doe',
      hospitalName: 'Lahore General Hospital',
    });

    expect(whatsapp).toContain('*🚨 CRITICAL RADIOLOGY ALERT [CT]*');
    expect(whatsapp).toContain('Ahmad Ali');
    expect(whatsapp).toContain('192609005769');
    expect(whatsapp).toContain('Lahore General Hospital');
    expect(whatsapp).toContain('Dr. Jane Doe');
    expect(whatsapp).toContain('🚨 *Intracranial Hemorrhage*');
  });
});
