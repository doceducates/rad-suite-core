import { NextResponse } from 'next/server';
import { z } from 'zod';
import { detectReportDiscrepanciesAI } from '@/services/gemini.service';
import { withAuth } from '@/lib/api-handler';

const AnalyzeSchema = z.object({
  findings: z.string().default(''),
  impression: z.string().default(''),
  modality: z.string().optional(),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = AnalyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { findings, impression, modality } = parsed.data;
    const result = await detectReportDiscrepanciesAI(findings, impression, modality || 'CT');

    return NextResponse.json({
      success: true,
      discrepancies: result.discrepancies,
      shadowDifferentials: result.shadowDifferentials,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_report_quality_check',
      entityType: 'Report',
    },
  }
);
