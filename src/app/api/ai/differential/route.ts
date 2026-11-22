import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { generateDifferentialDiagnosis } from '@/services/ai-differential.service';

const DifferentialSchema = z.object({
  findings: z.string().min(1, 'Findings are required for differential diagnosis'),
  modality: z.string().optional().default('CT'),
  clinicalHistory: z.string().optional(),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = DifferentialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await generateDifferentialDiagnosis(
      parsed.data.findings,
      parsed.data.modality,
      parsed.data.clinicalHistory
    );

    return NextResponse.json({ success: true, ...result });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_differential_diagnosis',
      entityType: 'Report',
    },
  }
);
