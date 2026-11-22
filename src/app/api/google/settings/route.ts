// Layer 1 (Transport): Google Settings Update Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { updateUserGoogleSettings } from '@/services/google-auth.service';
import { z } from 'zod';

const GoogleSettingsSchema = z.object({
  autoSync: z.boolean().optional(),
  rootFolderId: z.string().optional(),
});

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = GoogleSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updated = await updateUserGoogleSettings(user.id, parsed.data);
    return NextResponse.json({
      success: true,
      ...updated,
    });
  },
  { roles: ['radiologist', 'resident', 'consultant', 'pgr', 'admin'] }
);
