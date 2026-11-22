import { NextRequest, NextResponse } from 'next/server';
import { importStudyToWorklist } from '@/services/pacs.service';
import { PacsImportSchema } from '@/lib/validation';
import { withAuth } from '@/lib/api-handler';

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = PacsImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const result = await importStudyToWorklist(
      parsed.data as any,
      user.id,
      user.name
    );

    return NextResponse.json({
      success: true,
      studyId: result.studyId,
      accessionNumber: result.accessionNumber,
      message: `Study ${result.accessionNumber} successfully imported to Rad Suite worklist.`,
    });
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
    audit: {
      action: 'import_pacs_study',
      entityType: 'Study',
    },
  }
);
