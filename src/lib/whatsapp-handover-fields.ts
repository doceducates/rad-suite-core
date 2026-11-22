// Layer 2 (Domain/Services): WhatsApp Handover Fields Definitions & Presets
// Strict File Size Invariant: Target < 150 lines

export interface HandoverFieldsConfig {
  includeBranding: boolean;
  includeConsultant: boolean;
  includeResident: boolean;
  includeDate: boolean;
  includeTotalCases: boolean;
  includeTotalStudies: boolean;
  includeSummaryCount?: boolean; // Legacy fallback for includeTotalCases
  includePatientName: boolean;
  includeAccession: boolean;
  includeStatus: boolean;
  includeAgeGender: boolean;
  includeModalityExam: boolean;
  includeMrn: boolean;
  includeDiagnosisHighlights: boolean;
  includeDepartment: boolean;
  includePriorityAlerts: boolean;
  includePortalReminder: boolean;
}

export const DEFAULT_HANDOVER_FIELDS: HandoverFieldsConfig = {
  includeBranding: true,
  includeConsultant: true,
  includeResident: true,
  includeDate: true,
  includeTotalCases: true,
  includeTotalStudies: true,
  includePatientName: true,
  includeAccession: true,
  includeStatus: true,
  includeAgeGender: true,
  includeModalityExam: true,
  includeMrn: true,
  includeDiagnosisHighlights: true,
  includeDepartment: true,
  includePriorityAlerts: true,
  includePortalReminder: true,
};

export const SIMPLE_HANDOVER_FIELDS: HandoverFieldsConfig = {
  includeBranding: false,
  includeConsultant: true,
  includeResident: true,
  includeDate: true,
  includeTotalCases: false,
  includeTotalStudies: false,
  includePatientName: true,
  includeAccession: true,
  includeStatus: true,
  includeAgeGender: false,
  includeModalityExam: false,
  includeMrn: false,
  includeDiagnosisHighlights: false,
  includeDepartment: false,
  includePriorityAlerts: false,
  includePortalReminder: false,
};

export interface FieldItemDef {
  key: keyof HandoverFieldsConfig;
  label: string;
  description?: string;
  group: 'header' | 'case' | 'footer';
}

export const FIELD_DEFINITIONS: FieldItemDef[] = [
  // Header Group
  { key: 'includeBranding', label: 'Rad Suite Core Branding', description: 'Header banner: 🏥 Rad Suite Core', group: 'header' },
  { key: 'includeConsultant', label: 'Senior Consultant', description: 'Supervising consultant name line', group: 'header' },
  { key: 'includeResident', label: 'Resident Radiologist', description: 'Reporting resident line (myself)', group: 'header' },
  { key: 'includeDate', label: 'Date & Time', description: 'Handover generation timestamp', group: 'header' },
  { key: 'includeTotalCases', label: 'Total Cases Count', description: 'Count total patient cases (e.g. 21 Cases)', group: 'header' },
  { key: 'includeTotalStudies', label: 'Total Studies Count', description: 'Count total ordered studies (e.g. 26 Studies for multi-study cases)', group: 'header' },

  // Case Information Group
  { key: 'includePatientName', label: 'Patient Name', description: 'Full name on diagnostic order', group: 'case' },
  { key: 'includeAccession', label: 'Accession Number', description: 'PACS accession identifier', group: 'case' },
  { key: 'includeStatus', label: 'Status & Hold Notes', description: 'Draft, Verified, or Pending reason & notes', group: 'case' },
  { key: 'includeAgeGender', label: 'Age & Gender', description: 'e.g. (58y / Female) alongside patient name', group: 'case' },
  { key: 'includeModalityExam', label: 'Modality & Exam Description', description: 'e.g. [MRI] MRI Lumbar Spine', group: 'case' },
  { key: 'includeMrn', label: 'Patient MRN', description: 'Hospital Medical Record Number', group: 'case' },
  { key: 'includeDiagnosisHighlights', label: 'Key Diagnosis Highlights', description: '🎯 Primary takeaway for reported cases', group: 'case' },
  { key: 'includeDepartment', label: 'Referring Department', description: 'e.g. Emergency (ER), OPD, Inpatient Ward', group: 'case' },
  { key: 'includePriorityAlerts', label: 'Priority & Critical Alerts', description: 'STAT urgent priority & critical finding flags', group: 'case' },

  // Footer Group
  { key: 'includePortalReminder', label: 'HMIS Portal Reminder', description: 'Instructions to review and verify on HMIS Portal', group: 'footer' },
];
