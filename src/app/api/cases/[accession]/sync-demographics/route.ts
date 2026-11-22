import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { getUserHmisCredentials } from '@/services/auth.service';
import { syncCaseDemographics } from '@/services/hmis/hmis-demographics.service';

export const POST = withAuth(
  async (req: NextRequest, { params, user }: any = {}) => {
    const rawAccession = params?.accession || '';
    const accession = decodeURIComponent(rawAccession).trim();

    if (!accession) {
      return NextResponse.json({ success: false, error: 'Accession number is required' }, { status: 400 });
    }

    try {
      const credentials = await getUserHmisCredentials(user?.id);
      const result = await syncCaseDemographics(accession, credentials);

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        demographics: result.demographics,
        patient: result.updatedPatient,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed syncing demographics' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['resident', 'radiologist', 'admin'],
    audit: { action: 'sync_demographics', entityType: 'Study' },
  }
);
