import { describe, it, expect, vi } from 'vitest';
import {
  normalizeMrn,
  isPunjabHmisMrn,
  generateDeterministicMrn,
  resolvePatientByMrn,
} from '../mrn-resolution.service';

describe('Deterministic MRN Resolution Service (P1 #12)', () => {
  describe('normalizeMrn', () => {
    it('normalizes common Pakistani hospital MRN prefixes to canonical MRN-', () => {
      expect(normalizeMrn('MR-99412')).toBe('MRN-99412');
      expect(normalizeMrn('mrn: 88104')).toBe('MRN-88104');
      expect(normalizeMrn('MRN # 77291')).toBe('MRN-77291');
      expect(normalizeMrn('mr_12345')).toBe('MRN-12345');
    });

    it('preserves clean Punjab HMIS 14-digit national IDs', () => {
      const hmisId = '19202521012202';
      expect(normalizeMrn(hmisId)).toBe('19202521012202');
      expect(isPunjabHmisMrn(hmisId)).toBe(true);
    });

    it('handles whitespace, punctuation noise, and empty strings gracefully', () => {
      expect(normalizeMrn('')).toBe('');
      expect(normalizeMrn(null)).toBe('');
      expect(normalizeMrn('   MRN-2026-9041   ')).toBe('MRN-2026-9041');
      expect(normalizeMrn('MRN---9041')).toBe('MRN-9041');
    });
  });

  describe('generateDeterministicMrn', () => {
    it('produces identical deterministic hashes for identical patient attributes', () => {
      const mrn1 = generateDeterministicMrn('Zainab Bibi', 45, 'Female');
      const mrn2 = generateDeterministicMrn('Zainab Bibi', 45, 'Female');
      const mrnCaseInsensitive = generateDeterministicMrn('zainab bibi', 45, 'female');

      expect(mrn1).toBe(mrn2);
      expect(mrn1).toBe(mrnCaseInsensitive);
      expect(mrn1).toMatch(/^MRN-DET-[A-F0-9]{8}$/);
    });

    it('produces different hashes for different patients', () => {
      const mrn1 = generateDeterministicMrn('Zainab Bibi', 45, 'Female');
      const mrn2 = generateDeterministicMrn('Ahmad Khan', 62, 'Male');
      expect(mrn1).not.toBe(mrn2);
    });
  });

  describe('resolvePatientByMrn', () => {
    it('resolves existing patient idempotently without duplicates', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'pat-existing-1', mrNumber: 'MRN-99412', fullName: 'Existing Patient', phone: null },
        ]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue({}),
      };

      const result = await resolvePatientByMrn(
        { mrn: 'MR-99412', fullName: 'Existing Patient', phone: '03001234567' },
        mockTx
      );

      expect(result.id).toBe('pat-existing-1');
      expect(result.isNew).toBe(false);
      expect(mockTx.insert).not.toHaveBeenCalled();
    });

    it('creates new patient with normalized canonical MRN when not found', async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue({}),
      };

      const result = await resolvePatientByMrn(
        { mrn: 'MR-55290', fullName: 'New Patient', age: 34, gender: 'Male' },
        mockTx
      );

      expect(result.mrNumber).toBe('MRN-55290');
      expect(result.isNew).toBe(true);
      expect(mockTx.insert).toHaveBeenCalledTimes(1);
    });
  });
});
