/**
 * VoiceStudio Local STT Service (Layer 2 - Domain/Services)
 * Interfaces with local CUDA-accelerated VoiceStudio instance on port 3900.
 * Injects dynamic medical vocabulary hints to optimize radiology speech recognition.
 */
import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';
import { buildAcousticVocabularyPrompt } from './clinical-vocabulary.service';

export interface VoiceStudioTranscribeOptions {
  audioBuffer?: Buffer;
  audioUrl?: string;
  mimeType?: string;
  modality?: string;
  studyDescription?: string;
  clinicalHistory?: string;
  model?: string;
  baseUrl?: string;
}

export interface VoiceStudioTranscribeResult {
  success: boolean;
  text?: string;
  duration?: number;
  device?: string;
  error?: string;
}

const DEFAULT_VOICESTUDIO_URL = config.voiceStudioUrl || 'http://127.0.0.1:3900';

/**
 * Resolves an audio buffer from a file path, URL, or raw buffer.
 */
export function resolveAudioBuffer(
  audioBuffer?: Buffer,
  audioUrl?: string
): { buffer: Buffer; mimeType: string } | null {
  if (audioBuffer && audioBuffer.length > 0) {
    return { buffer: audioBuffer, mimeType: 'audio/webm' };
  }

  if (audioUrl) {
    // 1. Direct local media audio query: /api/media/audio?id=rec_... or /api/voice/recordings/stream?id=rec_...
    const mediaIdMatch = audioUrl.match(/id=(rec_[0-9a-zA-Z_]+)/);
    if (mediaIdMatch) {
      const mediaId = mediaIdMatch[1];
      const audioDir = path.join(process.cwd(), 'storage', 'media', 'audio');
      const vaultDir = path.join(process.cwd(), 'storage', 'media', 'voice_vault');
      for (const dir of [audioDir, vaultDir]) {
        if (fs.existsSync(dir)) {
          const matched = fs.readdirSync(dir).find((f) => f.startsWith(mediaId));
          if (matched) {
            const buf = fs.readFileSync(path.join(dir, matched));
            const ext = path.extname(matched).toLowerCase();
            const mimeType = ext === '.wav' ? 'audio/wav' : ext === '.mp4' ? 'audio/mp4' : 'audio/webm';
            return { buffer: buf, mimeType };
          }
        }
      }
    }

    // 2. Base64 Data URL
    if (audioUrl.startsWith('data:audio/')) {
      const parts = audioUrl.split(';base64,');
      const mime = parts[0].replace('data:', '');
      const buf = Buffer.from(parts[1], 'base64');
      return { buffer: buf, mimeType: mime };
    }
  }

  return null;
}

/**
 * Checks if the local VoiceStudio backend is active and which GPU device is handling inference.
 */
export async function checkVoiceStudioHealth(overrideUrl?: string): Promise<{
  isRunning: boolean;
  device?: string;
  version?: string;
  error?: string;
}> {
  const targetUrl = overrideUrl || DEFAULT_VOICESTUDIO_URL;
  try {
    const res = await fetch(`${targetUrl}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        isRunning: true,
        device: data.device || 'CUDA',
        version: data.version,
      };
    }
    return { isRunning: false, error: `VoiceStudio returned HTTP ${res.status}` };
  } catch (err: any) {
    return { isRunning: false, error: err.message || 'VoiceStudio offline on port 3900' };
  }
}

/**
 * Dispatches an audio buffer to VoiceStudio's CUDA-accelerated Whisper transcription endpoint.
 */
export async function transcribeAudioWithVoiceStudio(
  options: VoiceStudioTranscribeOptions
): Promise<VoiceStudioTranscribeResult> {
  const {
    audioBuffer,
    audioUrl,
    mimeType = 'audio/webm',
    modality = 'CT',
    studyDescription,
    model = 'whisper-1',
    baseUrl = DEFAULT_VOICESTUDIO_URL,
  } = options;

  const resolved = resolveAudioBuffer(audioBuffer, audioUrl);
  if (!resolved || resolved.buffer.length === 0) {
    return { success: false, error: 'Empty or unresolvable audio buffer' };
  }

  const effectiveBuffer = resolved.buffer;
  const effectiveMime = resolved.mimeType || mimeType;

  // Build acoustic condition prompt with learned medical vocabulary
  const prompt = buildAcousticVocabularyPrompt(modality, studyDescription);
  const ext = effectiveMime.includes('wav') ? 'wav' : 'webm';
  const boundary = `----VoiceStudioBoundary${Date.now()}`;

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--\r\n`;

  const headerPart =
    `${delimiter}Content-Disposition: form-data; name="model"\r\n\r\n${model}` +
    `${delimiter}Content-Disposition: form-data; name="prompt"\r\n\r\n${prompt}` +
    `${delimiter}Content-Disposition: form-data; name="file"; filename="dictation.${ext}"\r\n` +
    `Content-Type: ${effectiveMime}\r\n\r\n`;

  const headerBuffer = Buffer.from(headerPart, 'utf-8');
  const footerBuffer = Buffer.from(closeDelimiter, 'utf-8');
  const bodyBuffer = Buffer.concat([headerBuffer, effectiveBuffer, footerBuffer]);

  try {
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length.toString(),
      },
      body: bodyBuffer,
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `VoiceStudio error (HTTP ${res.status}): ${errText || res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      text: (data.text || '').trim(),
      duration: data.duration,
      device: 'cuda',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed connecting to VoiceStudio: ${err.message || 'Timeout/Network error'}`,
    };
  }
}
