import { NextResponse } from 'next/server';
import { transcribeWithMedASR, transcribeAudioBufferWithMedASR } from '@/services/medasr.service';
import { withAuth } from '@/lib/api-handler';

export const POST = withAuth(
  async (req) => {
    const contentType = req.headers.get('content-type') || '';
    let result;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.audioPath) {
        result = await transcribeWithMedASR(body.audioPath);
      } else if (body.audioBase64) {
        const cleanBase64 = body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        result = await transcribeAudioBufferWithMedASR(buffer);
      } else {
        return NextResponse.json({ success: false, error: 'audioPath or audioBase64 is required' }, { status: 400 });
      }
    } else {
      const arrayBuffer = await req.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return NextResponse.json({ success: false, error: 'Empty audio buffer received' }, { status: 400 });
      }
      result = await transcribeAudioBufferWithMedASR(Buffer.from(arrayBuffer));
    }

    return NextResponse.json(result);
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'medasr_audio_transcription',
      entityType: 'AudioDictation',
    },
  }
);
