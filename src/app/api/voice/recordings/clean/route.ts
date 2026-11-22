// Layer 1 (Transport): Retention Reaper Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { cleanExpiredRecordings } from '@/services/voice-vault.service';

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      let customDays: number | undefined;
      try {
        const body = await req.json();
        if (body.retentionDays && Number(body.retentionDays) > 0) {
          customDays = Number(body.retentionDays);
        }
      } catch {
        // Body optional
      }

      const result = cleanExpiredRecordings(customDays);

      return NextResponse.json({
        success: true,
        purgedCount: result.purgedCount,
        freedBytes: result.freedBytes,
        freedMb: +(result.freedBytes / (1024 * 1024)).toFixed(2),
        message: `Purged ${result.purgedCount} expired recordings, freed ${(result.freedBytes / (1024 * 1024)).toFixed(2)} MB.`,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Cleanup failed' }, { status: 500 });
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'pgr', 'consultant'],
    audit: { action: 'voice_recordings_clean', entityType: 'VoiceRecording' },
  }
);
