// Layer 2 (Domain/Services): Clinical Report Export Type Contracts

export interface ClinicalExportData {
  format: 'pdf' | 'docx';
  hospitalName?: string;
  department?: string;
  patientName: string;
  patientMrn: string;
  patientAge?: string | number;
  patientGender?: string;
  accessionNumber: string;
  modality: string;
  procedureName?: string;
  studyDescription?: string;
  studyDate?: string | Date;
  clinicalHistory?: string;
  technique?: string;
  comparison?: string;
  findings: string;
  impression: string;
  recommendations?: string;
  criticalFinding?: boolean;
  pgrName?: string;
  pgrDesignation?: string;
  consultantName?: string;
  consultantDesignation?: string;
  status?: string;
  printedDate?: string;
}

export interface ReportExportResult {
  buffer: Buffer | Uint8Array;
  mimeType: string;
  fileName: string;
}
