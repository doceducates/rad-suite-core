// Layer 1 (Transport): Voice Recordings Vault API Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import {
  listVoiceRecordings,
  deleteVoiceRecording,
  saveVoiceRecording,
} from '@/services/voice-vault.service';

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const source = searchParams.get('source') || undefined;
    const modality = searchParams.get('modality') || undefined;
    const patientMrn = searchParams.get('patientMrn') || undefined;

    const data = listVoiceRecordings({ search, source, modality, patientMrn });
    return NextResponse.json({ success: true, ...data });
  },
  { roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'] }
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const contentType = req.headers.get('content-type') || '';
      let buffer: Buffer | null = null;
      let mimeType = 'audio/webm';
      let patientName = '';
      let patientMrn = '';
      let accessionNumber = '';
      let studyId = '';
      let studyDescription = '';
      let modality = 'CT';
      let source: 'reporting_canvas' | 'comment' | 'voice_lab' = 'voice_lab';
      let duration = 0;
      let rawTranscript = '';
      let retentionDays = 5;

      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('audio') as File | null;
        if (!file) {
          return NextResponse.json({ success: false, error: 'Audio file is required' }, { status: 400 });
        }
        buffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type || 'audio/webm';
        patientName = (formData.get('patientName') as string) || '';
        patientMrn = (formData.get('patientMrn') as string) || '';
        accessionNumber = (formData.get('accessionNumber') as string) || '';
        studyId = (formData.get('studyId') as string) || '';
        studyDescription = (formData.get('studyDescription') as string) || '';
        modality = (formData.get('modality') as string) || 'CT';
        source = ((formData.get('source') as any) || 'voice_lab');
        duration = Number(formData.get('duration') || 0);
        rawTranscript = (formData.get('rawTranscript') as string) || '';
        retentionDays = Number(formData.get('retentionDays') || 5);
      } else {
        const body = await req.json();
        if (!body.audioBase64) {
          return NextResponse.json({ success: false, error: 'audioBase64 is required' }, { status: 400 });
        }
        const cleanBase64 = body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
        mimeType = body.mimeType || 'audio/webm';
        patientName = body.patientName || '';
        patientMrn = body.patientMrn || '';
        accessionNumber = body.accessionNumber || '';
        studyId = body.studyId || '';
        studyDescription = body.studyDescription || '';
        modality = body.modality || 'CT';
        source = body.source || 'voice_lab';
        duration = Number(body.duration || 0);
        rawTranscript = body.rawTranscript || '';
        retentionDays = Number(body.retentionDays || 5);
      }

      if (!buffer || buffer.length === 0) {
        return NextResponse.json({ success: false, error: 'Empty audio buffer' }, { status: 400 });
      }

      const record = saveVoiceRecording(buffer, {
        patientName,
        patientMrn,
        accessionNumber,
        studyId,
        studyDescription,
        modality,
        source,
        authorName: user?.name || 'Radiologist',
        authorRole: (user as any)?.role || 'resident',
        duration,
        mimeType,
        rawTranscript,
        retentionDays,
      });

      return NextResponse.json({ success: true, record });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed saving recording' }, { status: 500 });
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'],
    audit: { action: 'voice_recording_saved', entityType: 'VoiceRecording' },
  }
);

export const DELETE = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Recording ID is required' }, { status: 400 });
    }

    const removed = deleteVoiceRecording(id);
    if (!removed) {
      return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Recording deleted successfully' });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'],
    audit: { action: 'voice_recording_deleted', entityType: 'VoiceRecording' },
  }
);
