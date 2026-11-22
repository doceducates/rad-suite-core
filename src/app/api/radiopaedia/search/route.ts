import { NextRequest, NextResponse } from 'next/server';
import { fetchRadiopaediaCases } from '@/services/radiopaedia-api.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const modality = searchParams.get('modality') || 'CT';
    const bodyPart = searchParams.get('bodyPart') || undefined;

    try {
      const result = await fetchRadiopaediaCases(q, modality, bodyPart);
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
);
