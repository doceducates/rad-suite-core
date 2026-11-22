// Layer 1 (Transport): Report Export by ID Controller
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { generateReportExport } from '@/services/report-export.service';

export const GET = withAuth(
  async (req: NextRequest, { user, params }) => {
    const reportIdOrAccession = params?.id;
    if (!reportIdOrAccession) {
      return NextResponse.json({ success: false, error: 'Report ID or Accession required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const rawFormat = searchParams.get('format') || 'pdf';
    const format = rawFormat.toLowerCase() === 'docx' ? 'docx' : 'pdf';

    try {
      const result = await generateReportExport(
        {
          format,
          reportId: reportIdOrAccession,
          accessionNumber: reportIdOrAccession,
          findings: '',
          impression: '',
          modality: 'CT',
        },
        user
      );

      return new NextResponse(result.buffer as any, {
        status: 200,
        headers: {
          'Content-Type': result.mimeType,
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
          'Content-Length': String(result.buffer.length),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed generating report export' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['resident', 'radiologist', 'admin', 'service', 'consultant', 'pgr'],
    audit: { action: 'EXPORT_REPORT_BY_ID', entityType: 'Report' },
  }
);
