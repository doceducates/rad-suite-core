// Layer 1 (Transport): Stream Audio File from Voice Vault
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getVoiceRecordingFile } from '@/services/voice-vault.service';
import fs from 'fs';

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !/^rec_[0-9a-zA-Z_]+$/.test(id)) {
      return NextResponse.json({ success: false, error: 'Valid recording ID required' }, { status: 400 });
    }

    const resolved = getVoiceRecordingFile(id);
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
    }

    try {
      const fileBuffer = fs.readFileSync(resolved.filePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': resolved.mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Error streaming audio' }, { status: 500 });
    }
  },
  { roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'] }
);
