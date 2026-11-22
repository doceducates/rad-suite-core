// Layer 1 (Transport): Workstation Index Case Deletion Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { deleteCaseFromIndex } from '@/services/case-deletion.service';

export const DELETE = withAuth(
  async (req: NextRequest, { params, user }: any = {}) => {
    const rawAccession = params?.accession || '';
    const accession = decodeURIComponent(rawAccession).trim();

    if (!accession) {
      return NextResponse.json({ success: false, error: 'Accession number is required' }, { status: 400 });
    }

    try {
      const url = new URL(req.url);
      const reason = url.searchParams.get('reason') || 'User manual removal from workstation';

      const result = await deleteCaseFromIndex(accession, user, reason);
      return NextResponse.json({ success: true, accessionNumber: result.accessionNumber });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed deleting case from index' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['resident', 'radiologist', 'admin'],
    audit: { action: 'delete_case_from_index', entityType: 'Study' },
  }
);
