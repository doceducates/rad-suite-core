import { NextResponse } from 'next/server';
import { z } from 'zod';
import { processVoiceDictation } from '@/services/ai-dictation-pipeline.service';
import { withAuth } from '@/lib/api-handler';

const StructureSchema = z
  .object({
    transcript: z.string().optional(),
    text: z.string().optional(),
    modality: z.string().optional(),
    studyDescription: z.string().optional(),
    clinicalHistory: z.string().optional(),
    patientAge: z.union([z.string(), z.number()]).transform((val) => (val !== undefined && val !== null ? String(val) : undefined)).optional(),
    patientGender: z.string().optional(),
    patientName: z.string().optional(),
    radiologistName: z.string().optional(),
  })
  .refine((data) => data.transcript || data.text, {
    message: 'Transcript or text is required',
  });

export const maxDuration = 300;

export const POST = withAuth(
  async (req, context) => {
    const body = await req.json();
    const parsed = StructureSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const raw = parsed.data.transcript || parsed.data.text || '';
    const modality = parsed.data.modality || 'CT';
    const clinicianName =
      context.user.hmisReportingDoctorName ||
      parsed.data.radiologistName ||
      (context.user.name ? `${context.user.name} (${context.user.title || 'PGR'})` : 'Resident Radiologist (PGR)');

    const result = await processVoiceDictation({
      rawTranscript: raw,
      modality,
      studyDescription: parsed.data.studyDescription,
      clinicalHistory: parsed.data.clinicalHistory,
      patientAge: parsed.data.patientAge,
      patientGender: parsed.data.patientGender,
      patientName: parsed.data.patientName,
      radiologistName: clinicianName,
    });

    return NextResponse.json({ success: true, ...result });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'medgemma_structure_report',
      entityType: 'Report',
    },
  }
);
