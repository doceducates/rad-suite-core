// Layer 1: Transport Controller for Bulk PACS S3 Ingestion
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { dispatchClinicAction } from '@/services/clinic-node.service';
import { updateStudyS3Status } from '@/services/hospital-pacs-index.service';
import { logAudit } from '@/services/audit.service';
import { z } from 'zod';

const BulkSyncSchema = z.object({
  accessions: z.array(z.string().min(1)).min(1).max(100),
  nodeId: z.string().optional(),
});

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
    }

    const parsed = BulkSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid accession array' },
        { status: 400 }
      );
    }

    const { accessions, nodeId } = parsed.data;

    try {
      // Mark as queued in indexed database
      for (const acc of accessions) {
        await updateStudyS3Status(acc, 'queued');
      }

      // Dispatch atomic batch-upload-s3 action to Clinic Node (prevents pendingAction overwrite)
      await dispatchClinicAction(
        'batch-upload-s3',
        { id: user.id, name: user.name },
        { accessions },
        nodeId
      );

      await logAudit({
        userId: user.id,
        userName: user.name,
        action: 'PACS_BULK_SYNC_TRIGGERED',
        entityType: 'Study',
        entityId: accessions.slice(0, 5).join(','),
        details: `Clinician ${user.name} queued ${accessions.length} studies for bulk S3 upload.`,
      });

      return NextResponse.json({
        success: true,
        count: accessions.length,
        accessions,
        message: `Successfully queued ${accessions.length} studies for Cloud S3 synchronization.`,
      });
    } catch (err: any) {
      console.error('[BULK_SYNC_ERR]', err);
      return NextResponse.json(
        { success: false, error: 'Failed queueing studies for sync' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist'],
  }
);
