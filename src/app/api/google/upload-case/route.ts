// Layer 1 (Transport): Google Drive Case Archival Controller
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import { packageStudyToZip } from '@/services/case-packaging.service';
import { uploadStudyToUserGoogleDrive } from '@/services/gdrive-study-upload.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const accessionNumber = (body?.accessionNumber || '').trim();

    if (!accessionNumber) {
      return NextResponse.json({ error: 'Accession number is required' }, { status: 400 });
    }

    // 1. Consolidate study into a single ZIP buffer
    const studyBundle = await packageStudyToZip(accessionNumber);

    // 2. Dispatch to user's personal Google Drive
    const uploadResult = await uploadStudyToUserGoogleDrive({
      userId: user.id,
      accessionNumber,
      patientName: studyBundle.patientName,
      modality: studyBundle.modality,
      studyDate: studyBundle.studyDate,
      zipBuffer: studyBundle.buffer,
    });

    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error || 'Failed to upload to Google Drive' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      webViewLink: uploadResult.webViewLink,
      webContentLink: uploadResult.webContentLink,
      sizeBytes: uploadResult.sizeBytes,
    });
  } catch (err: any) {
    console.error('[GDRIVE_UPLOAD_CASE_API_ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error uploading study to Google Drive' },
      { status: 500 }
    );
  }
}
