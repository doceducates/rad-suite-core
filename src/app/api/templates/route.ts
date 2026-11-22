// Layer 1: Templates Transport API (Shared Institutional Templates)
// Invariant: Target < 250 lines, max 350 lines (AGENTS.md Rule 1)

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/services/auth.service';
import {
  getAllTemplatesShared,
  createSharedDbTemplate,
  getTemplateCategoriesSummary,
} from '@/services/templates-db.service';
import { z } from 'zod';

const CreateTemplateSchema = z.object({
  name: z.string().min(3, 'Template name must be at least 3 characters'),
  modality: z.string().min(2, 'Category / Modality is required'),
  subspecialty: z.string().optional().default('General'),
  description: z.string().optional().default(''),
  technique: z.string().min(5, 'Technique description is required'),
  normalFindings: z.union([z.array(z.string()), z.string()]),
  defaultImpression: z.string().min(5, 'Impression is required'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || searchParams.get('modality') || 'ALL';
    const query = (searchParams.get('search') || '').toLowerCase().trim();

    let templates = getAllTemplatesShared();

    if (category && category !== 'ALL') {
      const catUpper = category.toUpperCase().trim();
      templates = templates.filter((t) => {
        const modUpper = (t.modality || '').toUpperCase().trim();
        if (catUpper === 'X-RAY') {
          return ['X-RAY', 'XR', 'CR', 'DX'].includes(modUpper);
        }
        return modUpper === catUpper;
      });
    }

    if (query) {
      templates = templates.filter((t) => {
        return (
          t.name.toLowerCase().includes(query) ||
          (t.subspecialty && t.subspecialty.toLowerCase().includes(query)) ||
          (t.description && t.description.toLowerCase().includes(query)) ||
          (t.defaultImpression && t.defaultImpression.toLowerCase().includes(query))
        );
      });
    }

    const categories = getTemplateCategoriesSummary();

    return NextResponse.json({
      success: true,
      templates,
      categories,
      total: templates.length,
    });
  } catch (error: any) {
    console.error('[API_ERROR] Failed to fetch templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const json = await req.json();

    const parsed = CreateTemplateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid template payload' },
        { status: 400 }
      );
    }

    const template = createSharedDbTemplate({
      ...parsed.data,
      createdBy: currentUser?.name || currentUser?.email || 'Departmental Contributor',
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'Template created successfully and shared with all department users.',
    });
  } catch (error: any) {
    console.error('[API_ERROR] Failed to create shared template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}
