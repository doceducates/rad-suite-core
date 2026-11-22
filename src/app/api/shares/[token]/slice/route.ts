// Layer 1 (Transport): Consultant Shared Slice Streaming Endpoint (<80 lines)
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { verifyShareSessionProof } from '@/services/case-share.service';
import { db, sqlite, IS_SQLITE } from '@/db';
import { caseShares, studies } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLocalCaseById } from '@/services/local-cases.service';
import { getHotSliceBuffer } from '@/services/hot-case-staging.service';
import { getS3SliceBuffer } from '@/services/s3-retrieval.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const seriesNumber = searchParams.get('series') || '1';
    const sliceIndex = parseInt(searchParams.get('index') || '0', 10);

    const cookieProof = req.cookies.get(`rad_suite_share_${token}`)?.value;
    const queryProof = searchParams.get('proof') || undefined;
    const authHeader = req.headers.get('authorization');
    const bearerProof = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : undefined;
    const proof = cookieProof || queryProof || bearerProof;

    if (!verifyShareSessionProof(token, proof)) {
      return NextResponse.json({ error: 'Unauthorized slice access' }, { status: 401 });
    }

    // Resolve study accession
    let share: any = null;
    if (IS_SQLITE && sqlite) {
      share = sqlite.prepare('SELECT study_id, is_active FROM case_shares WHERE token = ?').get(token);
    } else {
      const [r] = await db.select().from(caseShares).where(eq(caseShares.token, token)).limit(1);
      share = r;
    }

    if (!share || (!share.is_active && share.isActive !== 1 && share.isActive !== true)) {
      return NextResponse.json({ error: 'Share link inactive' }, { status: 410 });
    }

    const studyId = share.study_id || share.studyId;
    const [study] = await db.select().from(studies).where(eq(studies.id, studyId as any)).limit(1);
    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 });
    }

    const caseId = study.accessionNumber;

    // 1. Local disk
    const localStudy = getLocalCaseById(caseId);
    if (localStudy) {
      const series = localStudy.series.find(
        (s) => s.seriesNumber === seriesNumber || parseInt(s.seriesNumber, 10) === parseInt(seriesNumber, 10)
      ) || localStudy.series[0];

      if (series && series.files[sliceIndex] && fs.existsSync(series.files[sliceIndex])) {
        const buffer = fs.readFileSync(series.files[sliceIndex]);
        return new Response(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/dicom',
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }
    }

    // 2. Hot Staging
    const hotBuffer = await getHotSliceBuffer(caseId, seriesNumber, sliceIndex);
    if (hotBuffer) {
      return new Response(new Uint8Array(hotBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom',
          'Content-Length': hotBuffer.length.toString(),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // 3. S3 Cloud
    const s3Buffer = await getS3SliceBuffer(caseId, seriesNumber, sliceIndex);
    if (s3Buffer) {
      return new Response(new Uint8Array(s3Buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/dicom',
          'Content-Length': s3Buffer.length.toString(),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    return NextResponse.json({ error: 'Slice not found' }, { status: 404 });
  } catch (err: any) {
    console.error('[SHARE_SLICE_ROUTE_ERR]', err);
    return NextResponse.json({ error: 'Failed to retrieve slice' }, { status: 500 });
  }
}
