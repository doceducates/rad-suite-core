import { describe, it, expect } from 'vitest';

describe('HMIS Worklist Response Envelope Unwrapping', () => {
  function extractWorklistRecords(data: any): any[] {
    return Array.isArray(data.data)
      ? data.data
      : (Array.isArray(data.data?.records)
        ? data.data.records
        : (Array.isArray(data.records) ? data.records : []));
  }

  it('unwraps enveloped gateway response ({ totalRecords, records }) without throwing', () => {
    const envelope = {
      success: true,
      data: {
        totalRecords: 2,
        page: 1,
        perPage: 50,
        count: 2,
        hasNextPage: false,
        records: [
          { mrn: '192026111', patientName: 'Fatima', accession: '192610000001' },
          { mrn: '192026222', patientName: 'Ahmed', accession: '192610000002' },
        ],
      },
    };

    const extracted = extractWorklistRecords(envelope);
    expect(Array.isArray(extracted)).toBe(true);
    expect(extracted.length).toBe(2);
    expect(extracted[0].patientName).toBe('Fatima');
    // Ensure forEach does not throw
    expect(() => extracted.forEach((p) => p.mrn)).not.toThrow();
  });

  it('unwraps legacy raw array response (data.data as Array)', () => {
    const legacyResponse = {
      success: true,
      data: [
        { mrn: '192026333', patientName: 'Usman', accession: '192610000003' },
      ],
    };

    const extracted = extractWorklistRecords(legacyResponse);
    expect(Array.isArray(extracted)).toBe(true);
    expect(extracted.length).toBe(1);
    expect(extracted[0].patientName).toBe('Usman');
  });

  it('handles null, undefined or empty objects gracefully without error', () => {
    expect(extractWorklistRecords({ success: true, data: {} })).toEqual([]);
    expect(extractWorklistRecords({ success: true, data: null })).toEqual([]);
    expect(extractWorklistRecords({ success: false })).toEqual([]);
  });
});
