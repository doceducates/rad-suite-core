// Layer 2 (Domain/Services): HMIS Worklist Record Normalizer
import { inferBodyPart } from '@/services/patient-management.service';
import { isFilmChargesStudy } from '@/services/unified-case-filters';

export interface NormalizedHmisItem {
  patientName: string;
  mrn: string;
  gender: string;
  age: number;
  department: string;
  room: string;
  modality: string;
  cpt: string;
  bodyPart: string;
  accession: string;
  investigationId: string;
  studyDate?: string;
  studyTime?: string;
  studyDateTime?: string;
  technologist?: string;
  referringDoctor?: string;
  clinic?: string;
  isFilmCharges?: boolean;
}

/**
 * Normalizes raw scraped HMIS records into structured diagnostic order items.
 * Ensures zero-loss ingestion even if accession links or dates are partially formatted.
 */
export function normalizeHmisRecords(rawData: any[]): NormalizedHmisItem[] {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  const items: NormalizedHmisItem[] = [];
  const seen = new Set<string>();

  for (const pat of rawData) {
    const pName = pat.patientName?.trim() || '';
    const pMrn = pat.mrn?.trim() || '';
    if (!pName || !pMrn || pName.toLowerCase() === 'patient') continue;

    const investigations = Array.isArray(pat.investigations) && pat.investigations.length > 0
      ? pat.investigations
      : [{
          accession: pat.accession || '',
          patientInvestigationId: pat.investigationId || '',
          studyTitle: pat.cpt || 'Diagnostic Exam',
        }];

    for (const inv of investigations) {
      let acc = (inv.accession || pat.accession || '').trim();
      const invId = String(inv.patientInvestigationId || pat.investigationId || '').trim();
      if (!acc) {
        acc = invId ? `INV-${invId}` : `HMIS-${pMrn}`;
      }

      const key = `${pMrn}-${acc}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const title = (inv.studyTitle || pat.cpt || '').trim();
      let mod = (pat.modality || '').toUpperCase();
      const room = (pat.room || '').toUpperCase();

      if (!mod || mod === 'UNKNOWN') {
        if (title.toUpperCase().includes('MRI') || room.includes('MRI')) {
          mod = 'MRI';
        } else if (title.toUpperCase().includes('X-RAY') || title.toUpperCase().includes('CR') || title.toUpperCase().includes('DX')) {
          mod = 'CR';
        } else if (title.toUpperCase().includes('ULTRASOUND') || title.toUpperCase().includes('USG')) {
          mod = 'US';
        } else {
          mod = 'CT';
        }
      }

      const cpt = title || `${mod} Scan`;
      const isFilm = isFilmChargesStudy(cpt, (inv as any).cpt);
      const bodyPart = isFilm ? 'Film Charges' : inferBodyPart(cpt, mod);
      const studyDateTime = inv.studyDateTime || pat.studyDateTime || pat.rawDateTime || (
        pat.studyDate ? `${pat.studyDate}T${pat.studyTime || '00:00:00'}` : undefined
      );

      let normGender = 'Male';
      const rawG = String(pat.gender || '').trim().toUpperCase();
      if (rawG === 'F' || rawG === 'FEMALE') normGender = 'Female';
      else if (rawG === 'O' || rawG === 'OTHER') normGender = 'Other';

      items.push({
        patientName: pName,
        mrn: pMrn,
        gender: normGender,
        age: pat.age ? parseInt(String(pat.age), 10) : 35,
        department: pat.department || pat.ward || pat.clinic || pat.room || '',
        room: pat.room || '',
        modality: mod,
        cpt,
        bodyPart,
        accession: acc,
        investigationId: invId,
        studyDate: pat.studyDate,
        studyTime: pat.studyTime,
        studyDateTime,
        technologist: pat.radiographer || pat.technologist || '',
        referringDoctor: pat.doctor || pat.referringDoctor || '',
        clinic: pat.clinic || '',
        isFilmCharges: isFilm,
      });
    }
  }

  return items;
}
