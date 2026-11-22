import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractHistoryFormOCR } from '@/services/gemini.service';
import { withAuth } from '@/lib/api-handler';

const IntakeOcrSchema = z.object({
  imageBase64: z.string().min(10, 'Image data is required'),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = IntakeOcrSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const data = await extractHistoryFormOCR(parsed.data.imageBase64);

    return NextResponse.json({
      success: true,
      data,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist'],
    audit: {
      action: 'intake_history_ocr',
      entityType: 'IntakeDocument',
      details: 'Digitized intake document via OCR',
    },
  }
);
