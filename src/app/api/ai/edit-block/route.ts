import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { processAiBlockEdit, AiBlockAction } from '@/services/ai-block-editor.service';

const AiEditSchema = z.object({
  action: z.enum(['impression', 'standardize', 'simplify', 'differential', 'custom'] as const),
  text: z.string().min(1, 'Text content is required'),
  modality: z.string().optional().default('CT'),
  customPrompt: z.string().optional(),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = AiEditSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await processAiBlockEdit({
      action: parsed.data.action as AiBlockAction,
      text: parsed.data.text,
      modality: parsed.data.modality,
      customPrompt: parsed.data.customPrompt,
    });

    return NextResponse.json({ success: true, ...result });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_block_edit',
      entityType: 'Report',
    },
  }
);
