import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import {
  generateCaseInsights,
  extractPrecachedInsights,
} from '@/services/case-insights.service';
import { db } from '@/db';
import { reports, patients, studies } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

const CaseInsightsRequestSchema = z.object({
  findings: z.string().min(1, 'Findings are required for case insights'),
  modality: z.string().optional().default('CT'),
  clinicalHistory: z.string().optional(),
  studyDescription: z.string().optional(),
  patientAge: z.union([z.string(), z.number()]).optional(),
  patientGender: z.string().optional(),
  studyId: z.string().optional(),
  reportId: z.string().optional(),
  accessionNumber: z.string().optional(),
  saveToReport: z.boolean().optional().default(false),
});

export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json();
    const parsed = CaseInsightsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      findings,
      modality,
      clinicalHistory,
      studyDescription,
      patientAge,
      patientGender,
      studyId,
      reportId,
      accessionNumber,
      saveToReport,
    } = parsed.data;

    const insights = await generateCaseInsights({
      findings,
      modality,
      clinicalHistory,
      patientAge,
      patientGender,
      studyDescription,
    });

    // Optionally persist into reports.content_json cache
    if (saveToReport && (reportId || studyId || accessionNumber)) {
      try {
        let targetReportId = reportId;
        if (!targetReportId && studyId) {
          const [r] = await db.select({ id: reports.id, contentJson: reports.contentJson })
            .from(reports).where(eq(reports.studyId, studyId)).limit(1);
          if (r) {
            targetReportId = r.id;
            const updated = { ...(typeof r.contentJson === 'object' && r.contentJson !== null ? r.contentJson : {}), caseInsights: insights };
            await db.update(reports).set({ contentJson: updated, updatedAt: new Date() }).where(eq(reports.id, r.id));
          }
        } else if (targetReportId) {
          const [r] = await db.select({ id: reports.id, contentJson: reports.contentJson })
            .from(reports).where(eq(reports.id, targetReportId)).limit(1);
          if (r) {
            const updated = { ...(typeof r.contentJson === 'object' && r.contentJson !== null ? r.contentJson : {}), caseInsights: insights };
            await db.update(reports).set({ contentJson: updated, updatedAt: new Date() }).where(eq(reports.id, targetReportId));
          }
        }
      } catch (cacheErr) {
        console.warn('[CASE_INSIGHTS_CACHE_WARN]', cacheErr);
      }
    }

    return NextResponse.json({ success: true, insights });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'consultant', 'pgr'],
    audit: {
      action: 'ai_case_insights_generate',
      entityType: 'Report',
    },
  }
);

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('reportId') || searchParams.get('studyId') || searchParams.get('accession');

    if (!identifier) {
      return NextResponse.json({ success: false, error: 'Identifier required' }, { status: 400 });
    }

    try {
      const [row] = await db
        .select({
          report: reports,
          patient: patients,
        })
        .from(reports)
        .leftJoin(studies, eq(studies.id, reports.studyId))
        .leftJoin(patients, eq(patients.id, reports.patientId))
        .where(
          or(
            eq(reports.id, identifier),
            eq(reports.studyId, identifier),
            eq(studies.accessionNumber, identifier.toUpperCase())
          )
        )
        .limit(1);

      if (row) {
        const cached = extractPrecachedInsights({
          contentJson: row.report.contentJson,
          clinicalNotes: row.patient?.clinicalNotes,
        });
        if (cached) {
          return NextResponse.json({ success: true, insights: cached, source: 'cached' });
        }
      }

      return NextResponse.json({ success: true, insights: null });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'consultant', 'pgr'],
  }
);
