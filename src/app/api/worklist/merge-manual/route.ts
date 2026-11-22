import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-handler';
import { mergeManualCaseToHmis, getMergeCandidatesForMrn } from '@/services/case-merge.service';

const MergeSchema = z.object({
  sourceAccession: z.string().min(1, 'Source accession number is required'),
  targetAccession: z.string().min(1, 'Target accession number is required'),
  notes: z.string().optional(),
});

export const GET = withAuth(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const mrn = searchParams.get('mrn');
      if (!mrn) {
        return NextResponse.json({ success: false, error: 'MRN parameter is required' }, { status: 400 });
      }

      const candidates = await getMergeCandidatesForMrn(mrn);
      return NextResponse.json({ success: true, candidates });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed fetching merge candidates' }, { status: 500 });
    }
  },
  { roles: ['admin', 'radiologist', 'resident'] }
);

export const POST = withAuth(
  async (req: NextRequest, { user }: { user?: any } = {}) => {
    try {
      const body = await req.json();
      const parsed = MergeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
      }

      const result = await mergeManualCaseToHmis(parsed.data, user);
      return NextResponse.json(result);
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Merge operation failed' }, { status: 400 });
    }
  },
  { roles: ['admin', 'radiologist', 'resident'] }
);
