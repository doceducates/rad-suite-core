import { z } from 'zod';

export const ReportExportSchema = z.object({
  format: z.enum(['pdf', 'docx']),
  reportId: z.string().optional(),
  studyId: z.string().optional(),
  accessionNumber: z.string().optional(),
  patientName: z.string().optional(),
  patientMrn: z.string().optional(),
  patientAge: z.union([z.string(), z.number()]).optional(),
  patientGender: z.string().optional(),
  modality: z.string().default('CT'),
  procedureName: z.string().optional(),
  studyDescription: z.string().optional(),
  studyDate: z.string().optional(),
  clinicalHistory: z.string().optional(),
  technique: z.string().optional(),
  comparison: z.string().optional(),
  findings: z.string().default(''),
  impression: z.string().default(''),
  recommendations: z.string().optional(),
  hospitalName: z.string().optional(),
  department: z.string().optional(),
  pgrName: z.string().optional(),
  pgrDesignation: z.string().optional(),
  consultantName: z.string().optional(),
  consultantDesignation: z.string().optional(),
  status: z.string().optional(),
});

export type ReportExportDto = z.infer<typeof ReportExportSchema>;
