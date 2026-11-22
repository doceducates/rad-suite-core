// Layer 1 (Transport): Lightweight Study Manifest API Endpoint
// Decouples study metadata into a tiny JSON manifest (~2KB, <50ms) for OHIF v3 & Cornerstone3D.
import { NextRequest, NextResponse } from 'next/server';
import {
  getStudyManifest,
  type StudyManifestResponse,
  type StudyManifestSeries,
} from '@/services/study-manifest.service';
import { withAuth } from '@/lib/api-handler';

export type { StudyManifestResponse, StudyManifestSeries };

/**
 * GET /api/cases/[accession]/manifest
 * Returns a lightweight JSON study manifest with all series, slice counts, orientations, and metadata.
 */
export const GET = withAuth<{ accession: string }>(
  async (_req: NextRequest, { params }) => {
    try {
      const rawAccession = params?.accession;

      if (!rawAccession || typeof rawAccession !== 'string' || !rawAccession.trim()) {
        return NextResponse.json(
          { error: 'Accession number is required' },
          { status: 400 }
        );
      }

      let accession = '';
      try {
        accession = decodeURIComponent(rawAccession).trim();
      } catch {
        return NextResponse.json(
          { error: 'Invalid accession number encoding' },
          { status: 400 }
        );
      }

      const { searchParams } = new URL(_req.url);
      const modality = searchParams.get('modality') || undefined;
      const studyInstanceUid = searchParams.get('studyInstanceUid') || undefined;

      const manifest = await getStudyManifest(accession, { modality, studyInstanceUid });

      if (!manifest) {
        return NextResponse.json(
          { error: `Study manifest not found for accession ${accession}` },
          { status: 404 }
        );
      }

      // HIPAA Invariant (Rule 3): private cache to prevent proxy caching of PHI
      return NextResponse.json(manifest, {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      });
    } catch (err) {
      // Rule 3: Error shielding - never leak raw SQL or stack traces
      console.error('[STUDY_MANIFEST_ROUTE_ERR]', err);
      return NextResponse.json(
        { error: 'Failed to retrieve study manifest' },
        { status: 500 }
      );
    }
  }
);
