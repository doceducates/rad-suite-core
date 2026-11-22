// Layer 1 (Transport): Google Disconnect Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { disconnectGoogleAccount } from '@/services/google-auth.service';

export const POST = withAuth(
  async (_req: NextRequest, { user }) => {
    await disconnectGoogleAccount(user.id);
    return NextResponse.json({
      success: true,
      message: 'Google account disconnected successfully.',
    });
  },
  { roles: ['radiologist', 'resident', 'consultant', 'pgr', 'admin'] }
);
