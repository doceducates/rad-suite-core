// Layer 1 (Transport): Google Connection Status Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getUserGoogleStatus, getGoogleOAuthCredentials } from '@/services/google-auth.service';

export const GET = withAuth(
  async (_req: NextRequest, { user }) => {
    const { configured } = getGoogleOAuthCredentials();
    const status = await getUserGoogleStatus(user.id);

    return NextResponse.json({
      success: true,
      configured,
      ...status,
    });
  },
  { roles: ['radiologist', 'resident', 'consultant', 'pgr', 'admin'] }
);
