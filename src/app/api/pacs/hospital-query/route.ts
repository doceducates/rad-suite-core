// Layer 1: Transport Controller for Hospital PACS Index & Live Query
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import {
  queryIndexedHospitalPacs,
  queryAndFederateHospitalPacs,
  indexHospitalPacsStudies,
  type IndexedPacsQueryFilter,
} from '@/services/hospital-pacs-index.service';
import { dispatchClinicAction } from '@/services/clinic-node.service';
import { z } from 'zod';

const QuerySchema = z.object({
  search: z.string().optional(),
  searchField: z.enum(['all', 'accession', 'mrn', 'name', 'description']).optional(),
  modality: z.string().optional(),
  region: z.string().optional(),
  datePreset: z.enum(['48h', 'today', 'yesterday', '7d', '30d', 'all', 'custom']).optional(),
  customFrom: z.string().optional(),
  customTo: z.string().optional(),
  s3Status: z.string().optional(),
  location: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
});

const LiveHarvestSchema = z.object({
  modality: z.string().default('MR'),
  modalities: z.array(z.string()).optional(),
  date: z.string().default('today'),
  scope: z.string().optional(),
  bypassKeywords: z.boolean().optional(),
  accession: z.string().optional(),
  queryLivePacs: z.boolean().default(false),
});

export const GET = withAuth(
  async (req: NextRequest, { user }) => {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      search: url.searchParams.get('search') || undefined,
      searchField: url.searchParams.get('searchField') || undefined,
      modality: url.searchParams.get('modality') || undefined,
      region: url.searchParams.get('region') || undefined,
      datePreset: url.searchParams.get('datePreset') || undefined,
      customFrom: url.searchParams.get('customFrom') || undefined,
      customTo: url.searchParams.get('customTo') || undefined,
      s3Status: url.searchParams.get('s3Status') || undefined,
      location: url.searchParams.get('location') || undefined,
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid query parameters' },
        { status: 400 }
      );
    }

    try {
      const result = await queryAndFederateHospitalPacs({
        ...(parsed.data as IndexedPacsQueryFilter),
        allowedStorageSources: user.allowedStorageSources,
        isAdmin: user.role === 'admin',
      });
      return NextResponse.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error('[HOSPITAL_PACS_QUERY_ERR]', err);
      return NextResponse.json(
        { success: false, error: 'Failed querying hospital PACS index' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'consultant', 'pgr', 'radiologist', 'resident', 'technologist', 'service'],
  }
);

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    const canHarvest =
      user.role === 'admin' ||
      user.allowedStorageSources?.includes('*') ||
      user.allowedStorageSources?.includes('pacs') ||
      user.allowedStorageSources?.includes('remote_node');
    if (!canHarvest) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Account lacks hospital PACS harvest permissions' },
        { status: 403 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const parsed = LiveHarvestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    try {
      if (parsed.data.accession) {
        // Targeted single-accession pull & sync
        const actionResult = await dispatchClinicAction(
          'fetch-accession',
          { id: user.id, name: user.name },
          { accession: parsed.data.accession }
        );
        return NextResponse.json({
          success: true,
          message: actionResult.message,
          accession: parsed.data.accession,
        });
      }

      // Modality harvest / 48-hour sync
      const actionResult = await dispatchClinicAction(
        'harvest-pacs',
        { id: user.id, name: user.name },
        {
          modality: parsed.data.modality,
          modalities: parsed.data.modalities,
          date: parsed.data.date,
          scope: parsed.data.scope,
          bypassKeywords: parsed.data.bypassKeywords,
        }
      );

      return NextResponse.json({
        success: true,
        message: actionResult.message,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed initiating PACS harvest' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['admin', 'radiologist', 'resident', 'technologist'],
  }
);
