import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db } from '@/db';
import { studies } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getUserHmisCredentials } from '@/services/auth.service';
import { dispatchHmisRevert } from '@/services/hmis/hmis-report-dispatch.service';

/**
 * POST /api/hmis/revert
 * Reverts patient draft in Punjab HMIS portal back to default normal template.
 */
export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload' }, { status: 400 });
    }

    if (!body?.mrn && !body?.patientMrn) {
      return NextResponse.json({ success: false, error: 'Patient MRN is required' }, { status: 400 });
    }

    const targetAccession = (body.accession || body.accessionNumber)?.trim();
    if (targetAccession) {
      const [studyRow] = await db
        .select({
          id: studies.id,
          assignedRadiologistId: studies.assignedRadiologistId,
        })
        .from(studies)
        .where(eq(sql`lower(${studies.accessionNumber})`, targetAccession.toLowerCase()))
        .limit(1);

      if (studyRow) {
        if (
          studyRow.assignedRadiologistId &&
          user?.id &&
          studyRow.assignedRadiologistId !== user.id &&
          user?.role !== 'admin'
        ) {
          return NextResponse.json(
            {
              success: false,
              error: 'Case is assigned to another clinician. Only the assigned radiologist can revert drafts in HMIS.',
            },
            { status: 403 }
          );
        }

        if (!studyRow.assignedRadiologistId && user?.role !== 'admin') {
          return NextResponse.json(
            {
              success: false,
              error: 'Please take up this case in your worklist before reverting drafts in HMIS.',
            },
            { status: 400 }
          );
        }
      }
    }

    const credentials = await getUserHmisCredentials(user?.id);

    const result = await dispatchHmisRevert(
      {
        mrn: body.mrn || body.patientMrn,
        accession: body.accession || body.accessionNumber,
        moduleId: body.moduleId,
      },
      credentials
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to revert draft in HMIS' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'HMIS_REVERT_DRAFT',
      entityType: 'Report',
      details: 'Reverted report draft to default normal template in Punjab HMIS',
    },
  }
);
