import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { updatePatientAgeResolution } from '@/services/hmis/hmis-demographics.service';

export const PATCH = withAuth(
  async (req: NextRequest, { params }: any = {}) => {
    const rawAccession = params?.accession || '';
    const accession = decodeURIComponent(rawAccession).trim();

    if (!accession) {
      return NextResponse.json({ success: false, error: 'Accession number is required' }, { status: 400 });
    }

    try {
      const body = await req.json();
      const ageNum = parseInt(String(body.age), 10);
      const source = (body.source || 'manual') as 'dicom' | 'hmis' | 'manual';

      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        return NextResponse.json({ success: false, error: 'Valid age (0-120) is required' }, { status: 400 });
      }

      const studyRows = await db
        .select({
          study: studies,
          patient: patients,
        })
        .from(studies)
        .innerJoin(patients, eq(patients.id, studies.patientId))
        .where(eq(studies.accessionNumber, accession.toUpperCase()))
        .limit(1);

      if (studyRows.length === 0) {
        return NextResponse.json({ success: false, error: `Case "${accession}" not found` }, { status: 404 });
      }

      const { patient } = studyRows[0];
      const result = await updatePatientAgeResolution(patient.mrNumber, ageNum, source);

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        age: ageNum,
        source,
        patient: result.patient,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed updating patient age' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['resident', 'radiologist', 'admin'],
    audit: { action: 'resolve_patient_age', entityType: 'Patient' },
  }
);
