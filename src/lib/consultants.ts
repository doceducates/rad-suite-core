// Layer 2/3 (Domain Constants): Official Faculty & Consultant Radiologists of LGH / PGMI
// Department of Diagnostic & Interventional Radiology, Lahore General Hospital / PGMI

export interface RadiologyConsultant {
  id: string;
  name: string;
  qualifications: string;
  designation: string;
  rank: 'hod' | 'associate_professor' | 'assistant_professor' | 'senior_consultant' | 'senior_registrar';
}

export const FACULTY_CONSULTANTS: RadiologyConsultant[] = [
  // Column 1
  {
    id: 'nighat-haroon',
    name: 'Dr. Nighat Haroon',
    qualifications: 'MBBS, FCPS',
    designation: 'HOD Radiology',
    rank: 'hod',
  },
  {
    id: 'fariha-shams',
    name: 'Dr. Fariha Shams',
    qualifications: 'MBBS, FCPS',
    designation: 'Assistant Professor',
    rank: 'assistant_professor',
  },
  {
    id: 'maria-afzal',
    name: 'Dr. Maria Afzal',
    qualifications: 'MBBS, FCPS',
    designation: 'Senior Registrar',
    rank: 'senior_registrar',
  },

  // Column 2
  {
    id: 'uzma-habib',
    name: 'Dr. Uzma Habib',
    qualifications: 'MBBS, FCPS',
    designation: 'Associate Professor',
    rank: 'associate_professor',
  },
  {
    id: 'sumaira-yousuf',
    name: 'Dr. Sumaira Yousuf',
    qualifications: 'MBBS, FCPS',
    designation: 'Assistant Professor',
    rank: 'assistant_professor',
  },
  {
    id: 'ayesha-asghar',
    name: 'Dr. Ayesha Asghar',
    qualifications: 'MBBS, FCPS',
    designation: 'Senior Registrar',
    rank: 'senior_registrar',
  },

  // Column 3
  {
    id: 'nadia-hanif',
    name: 'Dr. Nadia Hanif',
    qualifications: 'MBBS, FCPS',
    designation: 'Associate Professor',
    rank: 'associate_professor',
  },
  {
    id: 'fatima-iqbal',
    name: 'Dr. Fatima Iqbal',
    qualifications: 'MBBS, FCPS',
    designation: 'Assistant Professor',
    rank: 'assistant_professor',
  },
  {
    id: 'abeer-yasin',
    name: 'Dr. Abeer Yasin',
    qualifications: 'MBBS, FCPS',
    designation: 'Senior Registrar',
    rank: 'senior_registrar',
  },

  // Column 4
  {
    id: 'haroon-saeed',
    name: 'Dr. Haroon Saeed',
    qualifications: 'MBBS, FCPS',
    designation: 'Assistant Professor',
    rank: 'assistant_professor',
  },
  {
    id: 'nadia-irshad',
    name: 'Dr. Nadia Irshad',
    qualifications: 'MBBS, FCPS',
    designation: 'Assistant Professor',
    rank: 'assistant_professor',
  },
  {
    id: 'ayesha-mir',
    name: 'Dr. Ayesha Mir',
    qualifications: 'MBBS, FCPS',
    designation: 'Senior Registrar',
    rank: 'senior_registrar',
  },

  // Column 5
  {
    id: 'smeera-ahmad',
    name: 'Dr. Smeera Ahmad',
    qualifications: 'MBBS, MCPS, FCPS, FRCR',
    designation: 'Assistant Professor',
    rank: 'assistant_professor',
  },
  {
    id: 'fariha-sadaf',
    name: 'Dr. Fariha Sadaf',
    qualifications: 'MBBS, DMRD',
    designation: 'Sr. Consultant Radiologist',
    rank: 'senior_consultant',
  },
  {
    id: 'sidra-seyal',
    name: 'Dr. Sidra Seyal',
    qualifications: 'MBBS, FCPS',
    designation: 'Senior Registrar',
    rank: 'senior_registrar',
  },

  // Column 6
  {
    id: 'ali-mansoor',
    name: 'Dr. Ali Mansoor',
    qualifications: 'MBBS, FCPS, FRCR',
    designation: 'Assistant Professor',
    rank: 'assistant_professor',
  },
  {
    id: 'wajeeha-akbar',
    name: 'Dr. Wajeeha Akbar',
    qualifications: 'MBBS, FCPS, FRCR',
    designation: 'Senior Registrar',
    rank: 'senior_registrar',
  },
  {
    id: 'sidra-hameed',
    name: 'Dr. Sidra Hameed',
    qualifications: 'MBBS, FCPS',
    designation: 'Senior Registrar',
    rank: 'senior_registrar',
  },
];

export function findConsultantByName(name: string): RadiologyConsultant | undefined {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return FACULTY_CONSULTANTS.find(
    (c) =>
      c.name.toLowerCase() === clean ||
      c.name.toLowerCase().includes(clean) ||
      clean.includes(c.name.toLowerCase())
  );
}

export function formatConsultantSignature(name: string): string {
  const match = findConsultantByName(name);
  if (match) {
    return `${match.name} (${match.designation})`;
  }
  return name;
}

/**
 * Strips any trailing designation, academic title, or qualification immediately
 * following the doctor's name in parentheses or dashes (e.g. "Dr. Ayesha Asghar (Senior Registrar)" -> "Dr. Ayesha Asghar").
 */
export function cleanDoctorName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\s*\([^)]*(?:Registrar|Professor|Consultant|HOD|PGR|Resident|FCPS|FRCR|MCPS|SR|AP|DMRD)[^)]*\)/gi, '')
    .replace(/\s*[-–—:]\s*(?:Senior Registrar|SR|Assistant Professor|Asst\.?\s*Prof|Associate Professor|Assoc\.?\s*Prof|Professor|Prof|HOD|Consultant|PGR|Resident|MO)\b.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Resolves the professional designation for a clinician given their name or roster match.
 * Falls back cleanly based on role (consultant vs PGR) without duplicating words.
 */
export function resolveDoctorDesignation(
  name: string | null | undefined,
  fallbackRole: 'consultant' | 'pgr' = 'consultant'
): string {
  if (!name || !name.trim()) {
    return fallbackRole === 'pgr'
      ? 'Resident Radiologist (PGR)'
      : 'Consultant Radiologist';
  }

  // 1. Direct match in official faculty roster
  const facultyMatch = findConsultantByName(name);
  if (facultyMatch) {
    return facultyMatch.designation;
  }

  const clean = name.trim();

  // 2. Check title or suffix tokens in the string
  if (/\b(?:SR|Senior Registrar)\b/i.test(clean)) {
    return 'Senior Registrar';
  }
  if (/\b(?:AP|Assistant Professor|Asst\.?\s*Prof)\b/i.test(clean)) {
    return 'Assistant Professor';
  }
  if (/\b(?:Associate Professor|Assoc\.?\s*Prof)\b/i.test(clean)) {
    return 'Associate Professor';
  }
  if (/\b(?:Prof|Professor)\b/i.test(clean)) {
    return 'Professor of Radiology';
  }
  if (/\b(?:HOD|Head of Department)\b/i.test(clean)) {
    return 'HOD Radiology';
  }
  if (/\b(?:Consultant|FCPS|FRCR|MCPS)\b/i.test(clean)) {
    return 'Consultant Radiologist';
  }
  if (/\b(?:PGR|Resident|MO|Medical Officer)\b/i.test(clean)) {
    return 'Resident Radiologist (PGR)';
  }

  return fallbackRole === 'pgr'
    ? 'Resident Radiologist (PGR)'
    : 'Consultant Radiologist';
}

