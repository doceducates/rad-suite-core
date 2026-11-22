import { NextRequest, NextResponse } from 'next/server';
import { correctAndStructureTranscript } from '@/services/gemini.service';
import { transcribeAudioWithVoiceStudio } from '@/services/voicestudio-stt.service';
import { withAuth } from '@/lib/api-handler';

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const contentType = req.headers.get('content-type') || '';

      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('audio') as File | null;
        if (!file) {
          return NextResponse.json({ success: false, error: 'Audio file required' }, { status: 400 });
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const modality = (formData.get('modality') as string) || 'CT';
        const result = await transcribeAudioWithVoiceStudio({
          audioBuffer: buf,
          mimeType: file.type || 'audio/webm',
          modality,
        });
        return NextResponse.json(result);
      }

      const body = await req.json();

      // Audio buffer / url dispatch
      if (body.audioBase64 || body.audioUrl) {
        let buf: Buffer | undefined;
        if (body.audioBase64) {
          const clean = body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
          buf = Buffer.from(clean, 'base64');
        }
        const result = await transcribeAudioWithVoiceStudio({
          audioBuffer: buf,
          audioUrl: body.audioUrl,
          mimeType: body.mimeType,
          modality: body.modality,
        });
        return NextResponse.json(result);
      }

      // Legacy text structuring
      if (body.text) {
        const findings = await correctAndStructureTranscript(body.text, body.modality || 'CT');
        return NextResponse.json({ success: true, findings, text: body.text });
      }

      return NextResponse.json({ success: false, error: 'Provide text or audio' }, { status: 400 });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Transcribe error' }, { status: 500 });
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: { action: 'ai_transcribe', entityType: 'VoiceDictation' },
  }
);
