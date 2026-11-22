import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { askCopilotQuestion } from '@/services/ai-copilot-chat.service';

const CopilotChatSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  modality: z.string().optional().default('CT'),
  findings: z.string().optional().default(''),
  clinicalHistory: z.string().optional(),
  impression: z.string().optional(),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = CopilotChatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await askCopilotQuestion(parsed.data.query, {
      modality: parsed.data.modality,
      findings: parsed.data.findings,
      clinicalHistory: parsed.data.clinicalHistory,
      impression: parsed.data.impression,
    });

    return NextResponse.json({ success: true, ...result });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_copilot_chat',
      entityType: 'Report',
    },
  }
);
