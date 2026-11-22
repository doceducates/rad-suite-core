// Layer 1 (Transport): Report Export API Controller (PDF & DOCX)
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { ReportExportSchema } from '@/lib/validation';
import { generateReportExport } from '@/services/report-export.service';

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const parsed = ReportExportSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message || 'Invalid export request payload' },
          { status: 400 }
        );
      }

      const result = await generateReportExport(parsed.data, user);

      // Return raw binary stream with appropriate download attachment headers
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
      console.error('[REPORT_EXPORT_ERROR]', err);
      return NextResponse.json(
        { success: false, error: err.message || 'Failed generating report export' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['resident', 'radiologist', 'admin', 'service', 'consultant', 'pgr'],
    audit: { action: 'EXPORT_REPORT', entityType: 'Report' },
  }
);
