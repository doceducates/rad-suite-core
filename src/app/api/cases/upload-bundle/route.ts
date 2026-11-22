// Layer 1 (Transport): Drag & Drop DICOM Bundle Upload Controller
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import { ingestDicomBundle, IngestItem } from '@/services/dicom-bundle-ingestion.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
    }

    const formData = await req.formData();
    const zipFile = formData.get('zip') as File | null;
    const individualFiles = formData.getAll('files') as File[];

    let zipBuffer: Buffer | undefined;
    let files: IngestItem[] | undefined;

    if (zipFile && typeof zipFile.arrayBuffer === 'function') {
      const arr = await zipFile.arrayBuffer();
      zipBuffer = Buffer.from(arr);
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
    console.error('[UPLOAD_BUNDLE_API_ERROR]', err);
    return NextResponse.json(
      { error: 'Internal error processing DICOM upload' },
      { status: 500 }
    );
  }
}
