import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { getLocalCaseById } from '@/services/local-cases.service';
import { getHotSliceBuffer } from '@/services/hot-case-staging.service';
import { getS3SliceBuffer } from '@/services/s3-retrieval.service';
import { withAuth } from '@/lib/api-handler';

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get('caseId');
    const seriesNumber = searchParams.get('series') || '1';
    const sliceIndex = parseInt(searchParams.get('index') || '0', 10);
    const forceS3 = searchParams.get('source') === 's3';

    if (!caseId) {
      return NextResponse.json({ error: 'Missing caseId' }, { status: 400 });
    }

    // 1. Check local cases on disk (E:\Cases) unless explicitly forcing S3
    const study = !forceS3 ? getLocalCaseById(caseId) : null;
    if (study) {
      const series = seriesNumber
        ? study.series.find(
            (s) =>
              s.seriesNumber === seriesNumber ||
              parseInt(s.seriesNumber, 10) === parseInt(seriesNumber, 10)
          )
        : study.series[0];

      if (series && series.files[sliceIndex]) {
        const filePath = series.files[sliceIndex];
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          return new Response(new Uint8Array(buffer), {
            status: 200,
            headers: {
              'Content-Type': 'application/dicom',
              'Content-Length': buffer.length.toString(),
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      }
    }

    // 1.5. Check VPS Hot Staging disk (/storage/hot-cases/)
    if (!forceS3) {
      const hotBuffer = await getHotSliceBuffer(caseId, seriesNumber, sliceIndex);
      if (hotBuffer) {
        return new Response(new Uint8Array(hotBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/dicom',
            'Content-Length': hotBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600',
            'X-RadSuite-Source': 'hot-staging',
          },
        });
      }
    }

    // 2. Fall back to S3 Storage with progressive LRU cache
    const s3Buffer = await getS3SliceBuffer(caseId, seriesNumber, sliceIndex);
    if (s3Buffer) {
      return new Response(new Uint8Array(s3Buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom',
          'Content-Length': s3Buffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
          'X-RadSuite-Source': 's3',
        },
      });
    }

    // 3. Fall back to Direct Clinic Edge Streaming (Orthanc Pass-Through)
    try {
      const { getEdgeSliceBuffer } = await import('@/services/edge-streaming.service');
      const edgeBuffer = await getEdgeSliceBuffer(caseId, seriesNumber, sliceIndex);
      if (edgeBuffer) {
        return new Response(new Uint8Array(edgeBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/dicom',
            'Content-Length': edgeBuffer.length.toString(),
            'Cache-Control': 'public, max-age=3600',
            'X-RadSuite-Source': 'clinic-edge',
          },
        });
      }
    } catch (edgeErr) {
      console.warn('[EDGE_SLICE_FETCH_WARN]', edgeErr);
    }

    return NextResponse.json({ error: 'Slice not found on local disk, S3, or clinic edge node' }, { status: 404 });
  }
);
