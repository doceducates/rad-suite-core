// Layer 1 (Transport): Direct DICOM / ZIP Upload Controller (<70 lines)
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import { ingestDicomBundle, IngestItem } from '@/services/dicom-bundle-ingestion.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: login required to upload cases' }, { status: 401 });
    }

    const formData = await req.formData();
    const zipFile = (formData.get('zip') || formData.get('file')) as File | null;
    const individualFiles = formData.getAll('files') as File[];

    let zipBuffer: Buffer | undefined;
    let files: IngestItem[] | undefined;

    // Check if the single file is a ZIP archive
    if (zipFile && typeof zipFile.arrayBuffer === 'function' && (zipFile.name.endsWith('.zip') || zipFile.type.includes('zip'))) {
      const arr = await zipFile.arrayBuffer();
      zipBuffer = Buffer.from(arr);
    } else if (zipFile && typeof zipFile.arrayBuffer === 'function') {
      // Single DCM file uploaded under "file"
      const arr = await zipFile.arrayBuffer();
      files = [{ name: zipFile.name || 'image.dcm', buffer: Buffer.from(arr) }];
    } else if (individualFiles && individualFiles.length > 0) {
      files = [];
      for (const f of individualFiles) {
        if (typeof f.arrayBuffer === 'function') {
          const arr = await f.arrayBuffer();
          files.push({
            name: f.name,
            buffer: Buffer.from(arr),
          });
        }
      }
    } else {
      return NextResponse.json(
        { error: 'No files provided. Provide a .zip archive or .dcm files.' },
        { status: 400 }
      );
    }

    const result = await ingestDicomBundle(user.id, { zipBuffer, files });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to ingest DICOM bundle' }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[CASES_UPLOAD_API_ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error processing DICOM upload' },
      { status: 500 }
    );
  }
}
