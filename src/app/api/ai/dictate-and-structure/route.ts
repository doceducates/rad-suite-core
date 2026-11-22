import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { processVoiceDictation } from '@/services/ai-dictation-pipeline.service';

const dictateSchema = z.object({
  rawTranscript: z.string().min(1, 'Raw transcript is required'),
  modality: z.string().optional().default('CT'),
  clinicalHistory: z.string().optional(),
});

export const POST = withAuth(
  async (req, { user }: any = {}) => {
    const body = await req.json();
    const parsed = dictateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const clinicianName =
      user?.hmisReportingDoctorName ||
      (user?.name ? `${user.name} (${user.title || 'PGR'})` : '');

    const result = await processVoiceDictation({
      rawTranscript: parsed.data.rawTranscript,
      modality: parsed.data.modality,
      clinicalHistory: parsed.data.clinicalHistory,
      radiologistName: clinicianName,
    });

    return NextResponse.json(result);
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_dictation_structure',
      entityType: 'Report',
    },
  }
);

