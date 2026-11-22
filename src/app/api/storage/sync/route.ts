import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { syncStudyToCloud } from '@/services/cloud-sync.service';
import { withAuth } from '@/lib/api-handler';

const SyncRequestSchema = z.object({
  accessionNumber: z.string().min(1, 'Accession number is required'),
  patientName: z.string().default('UNKNOWN'),
  modality: z.string().default('CT'),
  studyDate: z.string().optional(),
  studyInstanceUid: z.string().optional(),
  sourceDir: z.string().optional(),
});

export const POST = withAuth(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const parsed = SyncRequestSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message || 'Invalid parameters' },
          { status: 400 }
        );
      }

      const result = await syncStudyToCloud(parsed.data);
      return NextResponse.json({ success: true, result });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Cloud sync failed' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'consultant', 'pgr'],
    audit: {
      action: 'sync_study_cloud_storage',
      entityType: 'Case',
    },
  }
);
