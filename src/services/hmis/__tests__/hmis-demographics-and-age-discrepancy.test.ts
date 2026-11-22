import { describe, it, expect } from 'vitest';
import { calculateAgeDiscrepancy } from '../../unified-case-filters';

// Note: Test parser logic directly using the clean regex contract
function extractModalDemographicsTest(text: string) {
  if (!text) return null;
  const nameM = text.match(/Name:\s*([^\r\n]+)/i);
  const mrnM = text.match(/MRN\s*#?:\s*([0-9]+)/i);
  const cnicM = text.match(/CNIC:\s*([0-9-]+)/i);
  const contactM = text.match(/Contact:\s*([0-9+]+)/i);
  const ageYearsM = text.match(/Age:\s*(\d+)\s*y/i);
  const rawAgeM = text.match(/Age:\s*([^\r\n]+)/i);
  const genderM = text.match(/Gender:\s*([a-zA-Z]+)/i);
  const clinicM = text.match(/Clinic:\s*([^\r\n]+)/i);
  const ackM = text.match(/Acknowledgement\s*Date:\s*([^\r\n]+)/i);

  let phone = contactM ? contactM[1].trim() : '';
  if (phone && phone.length === 11 && phone.startsWith('3')) {
    phone = '0' + phone;
  }

  let age: number | null = null;
  if (ageYearsM) {
    age = parseInt(ageYearsM[1], 10);
  } else if (rawAgeM) {
    const rawDigits = rawAgeM[1].match(/\d+/);
    if (rawDigits) age = parseInt(rawDigits[0], 10);
  }

  let gender: string | undefined = undefined;
  if (genderM) {
    const g = genderM[1].trim().toLowerCase();
    if (g === 'female') gender = 'Female';
    else if (g === 'male') gender = 'Male';
  }

  return {
    fullName: nameM ? nameM[1].trim() : undefined,
    mrn: mrnM ? mrnM[1].trim() : undefined,
    cnic: cnicM ? cnicM[1].trim() : undefined,
    phone: phone || undefined,
    age,
    rawAge: rawAgeM ? rawAgeM[1].trim() : undefined,
    gender,
    clinic: clinicM ? clinicM[1].trim() : undefined,
    acknowledgementDate: ackM ? ackM[1].trim() : undefined,
  };
}

describe('Age Discrepancy Gate (Scanner/Tech vs HMIS Ticket)', () => {
  it('flags discrepancy when scanner age and HMIS ticket age differ significantly', () => {
    // Clinical scenario: 27yo patient scanned, but family member registered under 49yo ticket
    const meta = calculateAgeDiscrepancy(27, 27, 49, 'dicom');
    expect(meta.ageDiscrepancy).toBe(true);
    expect(meta.dicomAge).toBe(27);
    expect(meta.hmisAge).toBe(49);
    expect(meta.ageSource).toBe('dicom');
  });

  it('flags pediatric vs adult crossover discordance even if delta is 3 years', () => {
    // Minor scanned (16yo), registered under brother (19yo)
    const meta = calculateAgeDiscrepancy(16, 16, 19, 'dicom');
    expect(meta.ageDiscrepancy).toBe(true);
  });

  it('does NOT flag discrepancy when scanner and HMIS ages are concordant', () => {
    // Minor difference within 1-2 years
    const meta = calculateAgeDiscrepancy(45, 45, 46, 'dicom');
    expect(meta.ageDiscrepancy).toBe(false);
  });

  it('does NOT flag discrepancy when only one age source is known', () => {
    const meta = calculateAgeDiscrepancy(35, 35, null, 'dicom');
    expect(meta.ageDiscrepancy).toBe(false);
    expect(meta.dicomAge).toBe(35);
    expect(meta.hmisAge).toBeNull();
  });
});

describe('HMIS Add Result Modal Demographics Extraction', () => {
  it('extracts complete demographics card from live HMIS modal text', () => {
    const sampleModalText = `
      Name: sadu mai
      MRN #: 19202656163729
      CNIC: 3220101727134
      Contact: 36548445601
      Age: 49y, 0m, 22d
      Gender: Female
      Acknowledgement Date: 15/Nov/2026 - 12:10 AM
      Clinic: Orthopedic Consultant Room
    `;

    const demo = extractModalDemographicsTest(sampleModalText);
    expect(demo).not.toBeNull();
    expect(demo?.fullName).toBe('sadu mai');
    expect(demo?.mrn).toBe('19202656163729');
    expect(demo?.cnic).toBe('3220101727134');
    expect(demo?.phone).toBe('036548445601'); // Auto-normalized with leading 0
    expect(demo?.age).toBe(49);
    expect(demo?.rawAge).toBe('49y, 0m, 22d');
    expect(demo?.gender).toBe('Female');
    expect(demo?.clinic).toBe('Orthopedic Consultant Room');
    expect(demo?.acknowledgementDate).toBe('15/Nov/2026 - 12:10 AM');
  });
});
