import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { updateUserProfile } from '@/services/auth.service';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  licenseNo: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  role: z.enum(['admin', 'radiologist', 'resident', 'pgr', 'consultant', 'technologist']).optional(),
  hmisHospitalId: z.string().max(20).optional(),
  hmisUsername: z.string().max(50).optional(),
  hmisPassword: z.string().max(200).optional(),
  hmisReportingDoctorName: z.string().max(150).optional(),
  supervisingConsultantName: z.string().max(150).optional(),
});

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json({ success: true, data: user });
});

export const PATCH = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const isUserAdmin = user.role === 'admin';
    const safeUpdates = { ...parsed.data };
    if (!isUserAdmin) {
      delete (safeUpdates as any).role;
    }
    const updated = await updateUserProfile(user.id, safeUpdates);
    return NextResponse.json({ success: true, data: updated });
  },
  {
    audit: {
      action: 'user_profile_update',
      entityType: 'User',
      details: 'User updated profile credentials or HMIS settings',
    },
  }
);
