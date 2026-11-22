import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getUserHmisCredentials } from '@/services/auth.service';
import { dispatchHmisSubmit } from '@/services/hmis/hmis-report-dispatch.service';
import { config } from '@/lib/config';
import { isUuid, sanitizeMrn } from '@/lib/mrn-security';

/**
 * POST /api/hmis/submit
 * Finalizes and submits radiology report directly to Punjab HMIS Gateway.
 * Safety Invariant: Hard-locked unless config.hmisAllowFinalSubmit is enabled.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    // 1. Multi-Tier Safety Guard: Verify if final submission is unlocked
    if (!config.hmisAllowFinalSubmit) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          error: 'HMIS Final Submission is locked by clinical safety policy. Only draft saves are currently permitted.',
        },
        { status: 423 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload' }, { status: 400 });
    }

    let safeMrn = sanitizeMrn(body?.mrn || body?.patientMrn);
    const targetAccession = (body.accession || body.accessionNumber)?.trim();

    if (targetAccession) {
      const [studyRow] = await db
        .select({
          id: studies.id,
          assignedRadiologistId: studies.assignedRadiologistId,
          patientMrn: patients.mrNumber,
        })
        .from(studies)
        .leftJoin(patients, eq(patients.id, studies.patientId))
        .where(eq(sql`lower(${studies.accessionNumber})`, targetAccession.toLowerCase()))
        .limit(1);

      if (studyRow) {
        // Auto-heal MRN if frontend passed UUID or empty MRN
        if (!safeMrn && studyRow.patientMrn && !isUuid(studyRow.patientMrn)) {
          safeMrn = studyRow.patientMrn.trim();
        }

        if (
          studyRow.assignedRadiologistId &&
          user?.id &&
          studyRow.assignedRadiologistId !== user.id &&
          user?.role !== 'admin'
        ) {
          return NextResponse.json(
            {
              success: false,
              error: 'Case is assigned to another clinician. Only the assigned radiologist can submit to HMIS.',
            },
            { status: 403 }
          );
        }

        if (!studyRow.assignedRadiologistId && user?.role !== 'admin') {
          return NextResponse.json(
            {
              success: false,
              error: 'Please take up this case in your worklist before submitting to HMIS.',
            },
            { status: 400 }
          );
        }
      }
    }

    if (!safeMrn) {
      return NextResponse.json({ success: false, error: 'Valid Patient MRN is required' }, { status: 400 });
    }

    const credentials = await getUserHmisCredentials(user?.id);

    const result = await dispatchHmisSubmit(
      {
        mrn: safeMrn,
        accession: body.accession || body.accessionNumber,
        patientName: body.patientName || body.patient_name || '',
        moduleId: body.moduleId,
        scanType: body.scanType,
        modality: body.modality,
        bodyPart: body.bodyPart,
        cpt: body.cpt,
        investigationId: body.investigationId || body.hmisInvestigationId,
        technique: body.technique,
        findings: body.findings || '',
        impression: body.impression || '',
        clinicalHistory: body.clinicalHistory,
        pgrName: body.pgrName || credentials?.reportingDoctorName || user?.hmisReportingDoctorName || user?.name || '',
        consultantName: body.consultantName || '',
        deepVerify: Boolean(body.deepVerify),
      },
      credentials
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to submit report to HMIS' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  },
  {
    roles: ['admin', 'radiologist'],
    audit: {
      action: 'HMIS_FINAL_SUBMIT',
      entityType: 'Report',
      details: 'Attempted final submission of radiology report directly to Punjab HMIS Gateway',
    },
  }
);
