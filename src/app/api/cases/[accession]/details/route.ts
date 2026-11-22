// Layer 1 (Transport): Case & Patient Demographics Editing Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';
import { updatePatientAndStudyDetails } from '@/services/patient-management.service';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { getLocalCases } from '@/services/local-cases.service';

const UpdateDetailsSchema = z.object({
  patientName: z.string().min(1, 'Patient name cannot be empty').optional(),
  patientMrn: z.string().optional(),
  accessionNumber: z.string().optional(),
  age: z.number().int().min(0).max(130).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.string().optional(),
  phone: z.string().optional(),
  modality: z.string().optional(),
  studyDescription: z.string().optional(),
  bodyPart: z.string().optional(),
  department: z.string().optional(),
  room: z.string().optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).optional(),
  referringDoctor: z.string().optional(),
  technologist: z.string().optional(),
  scheduledAt: z.string().optional(),
  clinicalHistory: z.string().optional(),
  contrastUsed: z.boolean().optional(),
  contrastAgent: z.string().optional(),
  contrastVolumeMl: z.number().optional(),
  mergeIfConflict: z.boolean().optional(),
});

export const GET = withAuth(
  async (_req: NextRequest, { params }: any = {}) => {
    const accession = params?.accession || '';
    const norm = decodeURIComponent(accession).trim().toUpperCase();

    const [study] = await db
      .select({ study: studies, patient: patients })
      .from(studies)
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .where(or(eq(studies.accessionNumber, norm), eq(studies.id, norm)))
      .limit(1);

    if (study) {
      return NextResponse.json({
        success: true,
        data: {
          accessionNumber: study.study.accessionNumber,
          patientName: study.patient.fullName,
          patientMrn: study.patient.mrNumber,
          age: study.patient.age,
          gender: study.patient.gender,
          dob: study.patient.dob,
          phone: study.patient.phone || '',
          modality: study.study.modality,
          studyDescription: study.study.scanType,
          bodyPart: study.study.bodyPart,
          priority: study.study.priority,
          department: study.study.department || '',
          room: study.study.room || '',
          referringDoctor: study.study.referringDoctor || '',
          technologist: (study.study as any).technologist || '',
          scheduledAt: study.study.scheduledAt,
          clinicalHistory: study.study.clinicalHistory || '',
          contrastUsed: Boolean(study.study.contrastUsed),
        },
      });
    }

    // Check local archive fallback
    const local = getLocalCases().find((c) => c.accessionNumber.toUpperCase() === norm);
    if (!local) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        accessionNumber: local.accessionNumber,
        patientName: local.patientName,
        patientMrn: local.patientId,
        age: local.age,
        gender: local.gender,
        dob: local.dateOfBirth,
        modality: local.modality === 'MR' ? 'MRI' : local.modality,
        studyDescription: local.studyDescription,
        bodyPart: local.modality === 'MR' ? 'Spine / Brain' : 'General',
        priority: 'routine',
        department: '',
        room: '',
        referringDoctor: local.referringPhysician || '',
        technologist: '',
        scheduledAt: local.studyDate,
        clinicalHistory: '',
        contrastUsed: false,
      },
    });
  },
  { roles: ['resident', 'radiologist', 'admin'], audit: { action: 'read_patient_details', entityType: 'Study' } }
);

export const PATCH = withAuth(
  async (req: NextRequest, { params, user }: any = {}) => {
    const accession = params?.accession || '';
    const body = await req.json();
    const parsed = UpdateDetailsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    try {
      const decodedAccession = decodeURIComponent(accession);
      const result = await updatePatientAndStudyDetails(decodedAccession, parsed.data, user);
      return NextResponse.json({ success: true, study: result.study, merged: (result as any).merged });
    } catch (err: any) {
      if (err.isConflict) {
        return NextResponse.json(
          {
            success: false,
            isConflict: true,
            conflictCode: err.conflictCode,
            error: err.message,
            conflictStudy: err.conflictStudy,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: err.message || 'Failed updating patient details' }, { status: 500 });
    }
  },
  { roles: ['resident', 'radiologist', 'admin'], audit: { action: 'update_patient_details', entityType: 'Study' } }
);
