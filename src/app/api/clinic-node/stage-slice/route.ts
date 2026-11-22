// Layer 1 (Transport): Fast VPS Staging Slice Ingestion API
import { NextRequest, NextResponse } from 'next/server';
import { saveStagedSlice, type StagedSliceMeta } from '@/services/hot-case-staging.service';
import { safeTimingEqual } from '@/lib/auth-guard';

export async function POST(req: NextRequest) {
  // 1. Authenticate with clinic node secret or API secret
  const tokenHeader = req.headers.get('x-clinic-token') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  const configuredSecret = process.env.CLINIC_NODE_SECRET?.trim();
  const expectedSecret = configuredSecret || (process.env.NODE_ENV === 'production' ? '' : 'clinic-secret-token');
  const internalSecret = (process.env.INTERNAL_API_SECRET || process.env.AUTH_SECRET || '').trim();

  const isTokenValid = expectedSecret.length > 0 && safeTimingEqual(tokenHeader, expectedSecret);
  const isKeyValid = internalSecret.length >= 16 && safeTimingEqual(apiKeyHeader, internalSecret);

  if (!isTokenValid && !isKeyValid) {
    return NextResponse.json({ success: false, error: 'Unauthorized clinic node request' }, { status: 401 });
  }

  // 2. Extract slice metadata headers
  const accession = req.headers.get('x-accession') || req.nextUrl.searchParams.get('accession');
  if (!accession) {
    return NextResponse.json({ success: false, error: 'Missing accession number' }, { status: 400 });
  }

  const seriesNumber = req.headers.get('x-series-number') || req.nextUrl.searchParams.get('series') || '1';
  const sliceIndex = parseInt(req.headers.get('x-slice-index') || req.nextUrl.searchParams.get('index') || '0', 10);
  const totalSlices = parseInt(req.headers.get('x-total-slices') || req.nextUrl.searchParams.get('total') || '0', 10);

  const meta: StagedSliceMeta = {
    accessionNumber: accession,
    patientName: decodeURIComponent(req.headers.get('x-patient-name') || 'PATIENT'),
    patientId: req.headers.get('x-patient-id') || '',
    modality: req.headers.get('x-modality') || 'MR',
    studyDescription: decodeURIComponent(req.headers.get('x-study-description') || ''),
    studyDate: req.headers.get('x-study-date') || '',
    studyTime: req.headers.get('x-study-time') || '',
    studyInstanceUid: req.headers.get('x-study-uid') || '',
    sopUid: req.headers.get('x-sop-uid') || '',
    seriesNumber,
    seriesDescription: decodeURIComponent(req.headers.get('x-series-description') || `Series_${seriesNumber}`),
    sliceIndex,
    totalSlices,
  };

  // 3. Read raw binary body and save
  try {
    const arrayBuf = await req.arrayBuffer();
    if (!arrayBuf || arrayBuf.byteLength === 0) {
      return NextResponse.json({ success: false, error: 'Empty DICOM payload' }, { status: 400 });
    }

    const buffer = Buffer.from(arrayBuf);
    const result = await saveStagedSlice(meta, buffer);

    return NextResponse.json({
      success: true,
      accession: meta.accessionNumber,
      seriesNumber,
      sliceIndex,
      stagedSlices: result.stagedSlices,
      totalSlices: result.totalSlices,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to stage slice on VPS disk' },
      { status: 500 }
    );
  }
}
