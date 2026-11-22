// Layer 1 (Transport): Consultant Shorthand AI Patcher Controller
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { runConsultantSurgicalPatch } from '@/services/ai-consultant-patcher.service';

const ConsultantPatchSchema = z.object({
  modality: z.string().default('MRI Lumbosacral Spine'),
  sectionTexts: z.record(z.string()),
  impressionList: z.array(z.string()).default([]),
  deltaNote: z.string().min(1, 'Delta note cannot be empty'),
  focusedSectionId: z.string().nullable().optional(),
  templateFormat: z.enum(['standardized', 'hmis']).default('standardized'),
});

export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json();
    const parsed = ConsultantPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    try {
      const result = await runConsultantSurgicalPatch({
        modalityOrTitle: parsed.data.modality,
        sectionTexts: parsed.data.sectionTexts,
        impressionList: parsed.data.impressionList,
        deltaNote: parsed.data.deltaNote,
        focusedSectionId: parsed.data.focusedSectionId,
        templateFormat: parsed.data.templateFormat,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed applying delta patch' }, { status: 500 });
    }
  },
  { roles: ['resident', 'pgr', 'radiologist', 'consultant', 'admin'], audit: { action: 'CONSULTANT_AI_PATCH', entityType: 'Report' } }
);
