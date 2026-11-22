// Layer 1: Transport Controller for RadiAnt DICOM ZIP Downloads from S3 Cloud Storage
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { createS3StudyZipBuffer } from '@/services/s3-retrieval.service';
import { z } from 'zod';

const DownloadQuerySchema = z.object({
  accession: z.string().optional(),
  accessions: z.string().optional(),
  modality: z.string().optional(),
});

export const GET = withAuth(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const parsed = DownloadQuerySchema.safeParse({
      accession: url.searchParams.get('accession') || undefined,
      accessions: url.searchParams.get('accessions') || undefined,
      modality: url.searchParams.get('modality') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { accession, accessions, modality } = parsed.data;
    const accList: string[] = [];
    if (accession) accList.push(accession.trim());
    if (accessions) {
      accList.push(...accessions.split(',').map((a) => a.trim()).filter(Boolean));
    }

    const uniqueAccs = Array.from(new Set(accList));
    if (uniqueAccs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one accession number is required' },
        { status: 400 }
      );
    }

    try {
      const zipBuffer = await createS3StudyZipBuffer(uniqueAccs, { modality });

      if (!zipBuffer || zipBuffer.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No DICOM files found in storage (Hot Staging or Cloud S3) for the specified study/studies',
          },
          { status: 404 }
        );
      }

      const filename =
        uniqueAccs.length === 1
          ? `${uniqueAccs[0].replace(/[^a-zA-Z0-9_-]/g, '_')}_RadiAnt.zip`
          : `RadiAnt_Batch_${uniqueAccs.length}_Studies.zip`;

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(zipBuffer.length),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (err: any) {
      console.error('[PACS_RADIANT_DOWNLOAD_ERR]', err);
      return NextResponse.json(
        { success: false, error: err.message || 'Failed generating RadiAnt DICOM archive' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist', 'service'],
  }
);
