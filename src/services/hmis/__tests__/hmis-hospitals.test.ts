import { describe, it, expect } from 'vitest';
import {
  HMIS_HOSPITALS,
  getHmisHospitalById,
  searchHmisHospitals,
} from '../hmis-hospitals.data';

describe('Punjab HMIS 78-Hospital Registry', () => {
  it('should include exactly 78 hospitals in the catalog', () => {
    expect(HMIS_HOSPITALS).toHaveLength(78);
  });

  it('should resolve key hospitals by exact ID correctly', () => {
    const lgh = getHmisHospitalById('19');
    expect(lgh).toBeDefined();
    expect(lgh?.name).toBe('Lahore General Hospital, Lahore');

    const bvh = getHmisHospitalById('1');
    expect(bvh?.name).toBe('Bahawal Victoria Hospital, Bahawalpur');

    const jinnah = getHmisHospitalById('22');
    expect(jinnah?.name).toBe('Jinnah Hospital, Lahore');

    const mianwali = getHmisHospitalById('116');
    expect(mianwali?.name).toBe('Mianwali Teaching Hospital, Minawali');
  });

  it('should return undefined for unknown hospital IDs', () => {
    expect(getHmisHospitalById('99999')).toBeUndefined();
    expect(getHmisHospitalById('')).toBeUndefined();
  });

  it('should search hospitals by partial name or city', () => {
    const lahoreResults = searchHmisHospitals('Lahore');
    expect(lahoreResults.length).toBeGreaterThan(10);
    expect(lahoreResults.some((h) => h.id === '19')).toBe(true); // LGH
    expect(lahoreResults.some((h) => h.id === '26')).toBe(true); // Mayo

    const faisalabadResults = searchHmisHospitals('Faisalabad');
    expect(faisalabadResults.length).toBeGreaterThanOrEqual(5);
    expect(faisalabadResults.some((h) => h.id === '4')).toBe(true); // Allied

    const rawalpindiResults = searchHmisHospitals('Rawalpindi');
    expect(rawalpindiResults.length).toBeGreaterThanOrEqual(4);
  });

  it('should handle case-insensitive and empty queries', () => {
    const mixedCase = searchHmisHospitals('mUlTaN');
    expect(mixedCase.length).toBeGreaterThanOrEqual(3);

    const all = searchHmisHospitals('');
    expect(all).toHaveLength(78);
  });
});
