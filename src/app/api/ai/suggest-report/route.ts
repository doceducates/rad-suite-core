import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { generateReportSuggestion } from '@/services/ai-suggestion.service';

const SuggestReportSchema = z.object({
  draftText: z.string().min(1, 'Draft text is required'),
  modality: z.string().optional().default('CT'),
  clinicalHistory: z.string().optional(),
  templateId: z.string().optional(),
  patientAge: z.union([z.string(), z.number()]).transform((val) => (val !== undefined && val !== null && !isNaN(Number(val)) ? Number(val) : undefined)).optional(),
  patientGender: z.string().optional(),
  activeSection: z.enum(['history', 'findings', 'impression']).optional().default('findings'),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = SuggestReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await generateReportSuggestion({
      draftText: parsed.data.draftText,
      modality: parsed.data.modality,
      clinicalHistory: parsed.data.clinicalHistory,
      templateId: parsed.data.templateId,
      patientAge: parsed.data.patientAge,
      patientGender: parsed.data.patientGender,
      activeSection: parsed.data.activeSection,
    });

    return NextResponse.json({ success: true, ...result });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_report_suggestion',
      entityType: 'Report',
    },
  }
);
