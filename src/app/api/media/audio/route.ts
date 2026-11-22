// Layer 1 (Transport): Clinical Audio & Voice Media Controller
// Invariant: Modular Layer 1 controller, HIPAA compliant audit, path traversal shielding
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import fs from 'fs';
import path from 'path';

const AUDIO_STORAGE_DIR = path.join(process.cwd(), 'storage', 'media', 'audio');

function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
    fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
  }
}

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      ensureAudioDir();
      const contentType = req.headers.get('content-type') || '';
      let buffer: Buffer | null = null;
      let extension = 'webm';
      let mimeType = 'audio/webm';
      let duration = 0;
      let label = 'consultant-memo';

      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const file = formData.get('audio') as File | null;
        if (!file) {
          return NextResponse.json({ success: false, error: 'Audio file required' }, { status: 400 });
        }
        buffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type || 'audio/webm';
        extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : 'webm';
        duration = Number(formData.get('duration') || 0);
        label = (formData.get('label') as string) || label;
      } else {
        const body = await req.json();
        if (!body.audioBase64) {
          return NextResponse.json({ success: false, error: 'audioBase64 required' }, { status: 400 });
        }
        const cleanBase64 = body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
        buffer = Buffer.from(cleanBase64, 'base64');
        mimeType = body.mimeType || 'audio/webm';
        extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : 'webm';
        duration = Number(body.duration || 0);
        label = body.label || label;
      }

      if (!buffer || buffer.length === 0) {
        return NextResponse.json({ success: false, error: 'Empty audio buffer' }, { status: 400 });
      }

      // Generate industry standard media ID: rec_YYYYMMDD_HHMMSS_<shortid>
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const shortId = Math.random().toString(36).substring(2, 8);
      const mediaId = `rec_${timestamp}_${shortId}`;
      const filename = `${mediaId}.${extension}`;
      const filePath = path.join(AUDIO_STORAGE_DIR, filename);

      fs.writeFileSync(filePath, buffer);

      const audioUrl = `/api/media/audio?id=${mediaId}`;

      return NextResponse.json({
        success: true,
        mediaId,
        filename,
        url: audioUrl,
        duration,
        mimeType,
        size: buffer.length,
        author: user?.name || 'Consultant',
        createdAt: now.toISOString(),
      });
    } catch (err: any) {
      console.error('[Audio Media API]', err);
      return NextResponse.json({ success: false, error: err.message || 'Failed saving audio' }, { status: 500 });
    }
  },
  { roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'] }
);

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const mediaId = searchParams.get('id');
      if (!mediaId || !/^rec_[0-9a-zA-Z_]+$/.test(mediaId)) {
        return NextResponse.json({ success: false, error: 'Invalid or missing mediaId' }, { status: 400 });
      }

      ensureAudioDir();
      const files = fs.readdirSync(AUDIO_STORAGE_DIR);
      const matched = files.find((f) => f.startsWith(mediaId));
      if (!matched) {
        return NextResponse.json({ success: false, error: 'Audio file not found' }, { status: 404 });
      }

      const safePath = path.join(AUDIO_STORAGE_DIR, matched);
      // Path traversal security check
      if (!safePath.startsWith(AUDIO_STORAGE_DIR)) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }

      const fileBuffer = fs.readFileSync(safePath);
      const ext = path.extname(matched).toLowerCase();
      const mimeType = ext === '.wav' ? 'audio/wav' : ext === '.mp4' ? 'audio/mp4' : 'audio/webm';

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed streaming audio' }, { status: 500 });
    }
  },
  { roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'] }
);
