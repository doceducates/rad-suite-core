// Layer 1 (Transport): Case Discussion Persistence API Controller
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { getDiscussionData, saveDiscussionData } from '@/services/discussion.service';

const DiscussionFindingSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  text: z.string().default(''),
});

const DiscussionSaveSchema = z.object({
  positiveFindings: z.array(DiscussionFindingSchema).default([]),
  positiveFindingsHtml: z.string().optional(),
  consultantNotes: z.string().default(''),
  updatedAt: z.string().optional(),
});

export const GET = withAuth(
  async (_req: NextRequest, { params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Case ID or Accession required' }, { status: 400 });
    }

    try {
      const data = await getDiscussionData(id);
      return NextResponse.json({ success: true, discussion: data });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed loading discussion' }, { status: 500 });
    }
  },
  { roles: ['resident', 'pgr', 'radiologist', 'consultant', 'admin'] }
);

export const POST = withAuth(
  async (req: NextRequest, { user, params }) => {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Case ID or Accession required' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = DiscussionSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    try {
      const res = await saveDiscussionData(id, parsed.data, user);
      if (!res.success) {
        return NextResponse.json({ success: false, error: 'Report not found for given identifier' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Discussion summary saved' });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed saving discussion' }, { status: 500 });
    }
  },
  { roles: ['resident', 'pgr', 'radiologist', 'consultant', 'admin'], audit: { action: 'SAVE_DISCUSSION', entityType: 'Report' } }
);

export const PUT = POST;
