import { NextResponse } from 'next/server';
import { z } from 'zod';
import { splitMultiPatientDictation, generateBatchHtmlReport } from '@/services/batch-reporting.service';
import { withAuth } from '@/lib/api-handler';

const BatchRequestSchema = z.object({
  action: z.enum(['split_multi_patient', 'export_html']),
  text: z.string().optional(),
  modality: z.string().optional(),
  reports: z.array(z.any()).optional(),
});

export const POST = withAuth(
  async (req) => {
    const body = await req.json();
    const parsed = BatchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { action, text, modality, reports } = parsed.data;

    if (action === 'split_multi_patient') {
      const splitReports = await splitMultiPatientDictation(text || '', modality || 'CT');
      return NextResponse.json({ success: true, reports: splitReports });
    }

    if (action === 'export_html') {
      const html = generateBatchHtmlReport(reports || []);
      return NextResponse.json({ success: true, html });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  },
  {
    roles: ['admin', 'radiologist', 'resident'],
    audit: {
      action: 'batch_reporting_action',
      entityType: 'BatchReport',
    },
  }
);
