// Layer 1 (Transport): Manual Case & Report Creation Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';
import { createManualPatientAndStudy } from '@/services/patient-management.service';

const ManualCaseSchema = z
  .object({
    patientName: z.string().min(2, 'Patient full name required'),
    patientMrn: z.string().optional(),
    accessionNumber: z.string().optional(),
    age: z.number().int().min(0).max(130).default(45),
    gender: z.enum(['Male', 'Female', 'Other']).default('Male'),
    dob: z.string().optional(),
    modality: z.string().min(1, 'Modality required').default('CT'),
    studyDescription: z.string().min(1, 'Study description required').default('Radiological Examination'),
    bodyPart: z.string().optional(),
    department: z.string().optional().default(''),
    room: z.string().optional().default(''),
    priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
    clinicalHistory: z.string().optional(),
    phone: z.string().optional(),
    referringDoctor: z.string().optional(),
    technologist: z.string().optional(),
    scheduledAt: z.string().optional(),
    contrastUsed: z.boolean().optional(),
    contrastAgent: z.string().optional(),
    contrastVolumeMl: z.number().optional(),
    allowDuplicate: z.boolean().optional().default(false),
  })
  .refine(
    (data) => Boolean((data.patientMrn && data.patientMrn.trim()) || (data.accessionNumber && data.accessionNumber.trim())),
    {
      message: 'At least one of MR Number or Accession Number is mandatory.',
      path: ['patientMrn'],
    }
  );

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = ManualCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    try {
      const result = await createManualPatientAndStudy(parsed.data, user);
      return NextResponse.json({
        success: true,
        accessionNumber: result.accessionNumber,
        studyId: result.studyId,
        reportId: result.reportId,
        study: result.study,
      });
    } catch (err: any) {
      if (err.isDuplicate) {
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            error: err.message,
            existingStudy: err.existingStudy,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: err.message || 'Failed creating manual case' }, { status: 500 });
    }
  },
  { roles: ['resident', 'radiologist', 'admin', 'service'], audit: { action: 'create_manual_case', entityType: 'Study' } }
);
