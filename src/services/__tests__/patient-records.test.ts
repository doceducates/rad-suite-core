import { describe, it, expect } from 'vitest';
import {
  formatWhatsAppDailyList,
  formatLogbookCSV,
  formatLogbookHTML,
  generateWhatsAppLink,
  type PatientRecordRow,
} from '../patient-records.service';

const mockRows: PatientRecordRow[] = [
  {
    patient: { id: '1', mrNumber: '192608002440', fullName: 'Zainab Bibi', age: 45, gender: 'Female', phone: '03001234567', guardianName: 'Muhammad Ali' },
    study: { id: 's1', accessionNumber: 'ACC-2602-0001', modality: 'MRI', scanType: 'Knee Joint Right', bodyPart: 'Right Knee', priority: 'routine', status: 'completed', scheduledAt: '2026-09-17T09:00:00Z', referringDoctor: 'Dr. Ahmad', clinicalHistory: 'Pain in right knee' },
    report: { id: 'r1', status: 'final', findings: 'Cruciate ligaments intact. Minimal effusion.', impression: '1. Minimal joint effusion.', criticalFinding: false, signedAt: '2026-09-17T10:00:00Z' },
  },
  {
    patient: { id: '2', mrNumber: '192608002441', fullName: 'Ahmad Khan', age: 62, gender: 'Male' },
    study: { id: 's2', accessionNumber: 'ACC-2602-0002', modality: 'CT', scanType: 'Chest HRCT', bodyPart: 'Chest', priority: 'urgent', status: 'completed', scheduledAt: '2026-09-17T11:00:00Z', referringDoctor: 'Dr. Fatima' },
    report: null,
  },
];

describe('Patient Records Service', () => {
  it('formatWhatsAppDailyList produces correct structure', () => {
    const result = formatWhatsAppDailyList(mockRows, new Date('2026-09-17'));
    expect(result).toContain('📋');
    expect(result).toContain('*Zainab Bibi*');
    expect(result).toContain('*Ahmad Khan*');
    expect(result).toContain('MRN: 192608002440');
    expect(result).toContain('MRI');
    expect(result).toContain('CT');
    expect(result).toContain('Total: 2 studies');
    expect(result).toContain('Final: 1');
  });

  it('formatLogbookCSV generates valid CSV with headers', () => {
    const csv = formatLogbookCSV(mockRows);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Sr#');
    expect(lines[0]).toContain('Patient Name');
    expect(lines[0]).toContain('Impression');
    expect(lines.length).toBe(3); // header + 2 data rows
    expect(lines[1]).toContain('192608002440');
    expect(lines[2]).toContain('Ahmad Khan');
  });

  it('formatLogbookCSV escapes commas in fields', () => {
    const rowWithComma: PatientRecordRow[] = [{
      patient: { id: '3', mrNumber: '123', fullName: 'Khan, Ali', age: 30, gender: 'Male' },
      study: { id: 's3', accessionNumber: 'ACC-3', modality: 'CT', scanType: 'Head', bodyPart: 'Head', priority: 'routine', status: 'completed', scheduledAt: '2026-09-17T12:00:00Z' },
      report: { id: 'r3', status: 'draft', findings: 'Normal, unremarkable', impression: 'Normal study' },
    }];
    const csv = formatLogbookCSV(rowWithComma);
    expect(csv).toContain('"Khan, Ali"');
    expect(csv).toContain('"Normal, unremarkable"');
  });

  it('formatLogbookHTML generates valid HTML table', () => {
    const html = formatLogbookHTML(mockRows, new Date('2026-09-17'));
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Radiology Logbook');
    expect(html).toContain('Zainab Bibi');
    expect(html).toContain('Ahmad Khan');
    expect(html).toContain('Total Studies: 2');
    expect(html).toContain('<table>');
  });

  it('generateWhatsAppLink creates encoded URL', () => {
    const link = generateWhatsAppLink('Hello World');
    expect(link).toBe('https://wa.me/?text=Hello%20World');
  });

  it('handles empty rows gracefully', () => {
    const wa = formatWhatsAppDailyList([], new Date('2026-09-17'));
    expect(wa).toContain('Total: 0 studies');

    const csv = formatLogbookCSV([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // header only

    const html = formatLogbookHTML([], new Date('2026-09-17'));
    expect(html).toContain('Total Studies: 0');
  });

  it('handles null report correctly in WhatsApp list', () => {
    const result = formatWhatsAppDailyList([mockRows[1]], new Date('2026-09-17'));
    expect(result).toContain('*Ahmad Khan*');
    expect(result).toContain('Pending: 1');
  });
});
