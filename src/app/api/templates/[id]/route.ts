// Layer 1: Single Template Mutations Transport API
// Invariant: Target < 250 lines, max 350 lines (AGENTS.md Rule 1)

import { NextRequest, NextResponse } from 'next/server';
import { updateSharedDbTemplate, deleteSharedDbTemplate } from '@/services/templates-db.service';
import { z } from 'zod';

const UpdateTemplateSchema = z.object({
  name: z.string().min(3).optional(),
  modality: z.string().min(2).optional(),
  subspecialty: z.string().optional(),
  description: z.string().optional(),
  technique: z.string().min(5).optional(),
  normalFindings: z.union([z.array(z.string()), z.string()]).optional(),
  defaultImpression: z.string().min(5).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();

    const parsed = UpdateTemplateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid update payload' },
        { status: 400 }
      );
    }

    const updated = updateSharedDbTemplate(id, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Template not found or could not be updated' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully across the department.',
    });
  } catch (error: any) {
    console.error('[API_ERROR] Update template error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteSharedDbTemplate(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Template not found or cannot be deleted (built-in master templates cannot be removed)' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template removed successfully.',
    });
  } catch (error: any) {
    console.error('[API_ERROR] Delete template error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}
