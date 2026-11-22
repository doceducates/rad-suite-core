// Layer 1 (Transport): PACS Study Retrieval Route
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';
import { retrieveStudyFromPacs } from '@/services/pacs-retrieval.service';

const RetrieveSchema = z.object({
  accessionNumber: z.string().min(1, 'Accession number is required'),
  studyInstanceUid: z.string().optional(),
  patientName: z.string().optional(),
  source: z.enum(['hospital_pacs', 'gdrive', 's3', 'remote_node', 'local_archive']).default('hospital_pacs'),
});

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = RetrieveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Storage Isolation Guard: check non-admin Google Drive requirement
    const { getUserStorageTarget, tagCaseForUserStorage } = await import('@/services/case-storage-router.service');
    const target = await getUserStorageTarget(user.id);
    if (!target.canClaim && target.reason === 'GOOGLE_DRIVE_REQUIRED') {
      return NextResponse.json({
        success: false,
        code: 'GOOGLE_DRIVE_REQUIRED',
        error: 'Personal Google Drive connection is required for saving cases. Please connect Google Drive in Settings.',
      }, { status: 403 });
    }

    const result = await retrieveStudyFromPacs(
      parsed.data.accessionNumber,
      parsed.data.studyInstanceUid,
      parsed.data.patientName,
      parsed.data.source
    );

    if (result.success) {
      await tagCaseForUserStorage(parsed.data.accessionNumber, user.id);
    }

    return NextResponse.json(result);
  },
  { roles: ['resident', 'radiologist', 'admin', 'technologist', 'service'], audit: { action: 'retrieve_pacs_study', entityType: 'Study' } }
);
