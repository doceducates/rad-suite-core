import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assessDictationProsody } from '@/services/gemini.service';
import { withAuth } from '@/lib/api-handler';

const AudioAssessmentSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  durationSec: z.number().optional().default(30),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = AudioAssessmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { transcript, durationSec } = parsed.data;
    const report = await assessDictationProsody(transcript, durationSec);

    return NextResponse.json({ success: true, report });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'ai_prosody_assessment',
      entityType: 'VoiceDictation',
    },
  }
);
