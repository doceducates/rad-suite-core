// Layer 1 (Transport): Two-Tier Clinical Impression Generation API Controller
// Invariant: Target < 250 lines, max 350 lines. Thin controller only.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { generateTwoTierImpression } from '@/services/two-tier-impression.service';

export const maxDuration = 120;

const ImpressionTierSchema = z.object({
  findings: z.string().min(1, 'Findings text is required to synthesize impression'),
  modality: z.string().optional().default('MRI'),
  patientAge: z.union([z.string(), z.number()]).optional(),
  flavor: z.enum(['local_high_yield', 'international_structured']).default('local_high_yield'),
  studyDescription: z.string().optional(),
});

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = ImpressionTierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    try {
      const result = await generateTwoTierImpression({
        ...parsed.data,
        radiologistName: user.name,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: 'Failed synthesizing impression. Please review input findings.' },
        { status: 500 }
      );
    }
  },
  { roles: ['resident', 'pgr', 'radiologist', 'consultant', 'admin'] }
);
